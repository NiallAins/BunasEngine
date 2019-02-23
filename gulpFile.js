var gulp       = require('gulp'),
    concat     = require('gulp-concat'),
    replace    = require('gulp-replace'),
    fs         = require('fs'),
    typescript = require('gulp-typescript'),
    tsProject  = typescript.createProject('./dist/tsconfig.json');

gulp.task('condense', function() {
    var saveSpace = [];
    return gulp.src('./modules/*.ts')
        .pipe(concat('Bunas.ts'))
        .pipe(replace(/(import \{.*)|([\n\s]+\/\/.*)/g, ''))
        .pipe(replace(/\/\*\*(.|\n|\r)*?\*\//g, ''))
        .pipe(replace(/`[^`]*`|'[^']'|"[^"]"/g, function($0) {
            saveSpace.push($0.replace(/(\r?\n|\r)\s*/g, ''));
            return '##saveSpace##';
        }))
        .pipe(replace(/\s+/g, ' '))
        .pipe(replace(/ ?([^%a-z0-9_ ]) ?/gi, '$1'))
        .pipe(replace(/##saveSpace##/g, function() { return saveSpace.shift(); }))
        .pipe(gulp.dest('./dist/dev'));
});

gulp.task('compile', function() {
    return tsProject.src()
        .pipe(tsProject())
        .pipe(gulp.dest('./dist/'))
});

gulp.task('autoDoc', function(cb) {
    gulp.src('./modules/*.ts')
        .pipe(concat('src.txt'))
        .pipe(gulp.dest('./docs'));
    gulp.src('./modules/*.ts')
        .pipe(concat('tmp.txt'))
        .on('data', function(file) {
            fs.writeFile(
                './docs/docs.json',
                tsToJson(file.contents.toString()),
                cb
            );
        });
});

gulp.task('default', ['condense', 'compile', 'autoDoc'], function() {
    gulp.watch('./modules/*.ts', ['condense', 'autoDoc']);
    gulp.watch('./dist/dev/*', ['compile']);
});

function tsToJson(inp) {
    let doc = {
        'common' : {
            d : 'The following functions and classes are in global scope and so can be imported directly.'
        }
    }

    function extractRecurse(data, currentModule, currentClass) {
        let dataHead = extractHead(data);
        if (!dataHead) {
            return;
        }
        let dataBody = extractBody(data.substring(dataHead.end));
        if (dataHead.type === 'module') {
            let newModule = dataHead.name;
            doc[newModule] = {
                d : {
                    desc: dataHead.desc,
                    snip: `import { ${dataHead.name} } from './Bunas';`
                }
            };
            extractRecurse(dataBody, newModule);
            extractRecurse(data.substring(dataHead.end + dataBody.length), currentModule);
        } else if (dataHead.type === 'class') {
            if (!doc[currentModule].c) {
                doc[currentModule].c = {};
            }
            doc[currentModule].c[dataHead.name] = {
                d : {
                    desc: dataHead.desc,
                    snip: `import { ${dataHead.name} } from './Bunas';`
                },
                m : {}
            }
            extractRecurse(dataBody, currentModule, dataHead.name);
            if (!doc[currentModule].c[dataHead.name].m['Class Constructor']) {
                let cStart = dataBody.indexOf('constructor');
                doc[currentModule].c[dataHead.name].m['Class Constructor'] = {
                    desc : '',
                    snip : extractFuncDeclaration(dataBody.substring(cStart))
                }
            }
            extractRecurse(data.substring(dataHead.end + dataBody.length), currentModule);
        } else {
            let t = '';
            switch (dataHead.type) {
                case 'type': t = 't'; break;
                case 'interface': t = 't'; break;
                case 'function': t = currentClass ? 'm' : 'f'; break;
                case 'let': t = 'v'; break;
                case 'const': t = 'v'; break;
            }
            let snip;
            if (dataHead.type === 'function') {
                snip = dataHead.snip;
                snip = snip.substring(0, snip.lastIndexOf('{'));
            } else {
                snip = dataBody.replace('export', '');
                if (!t) {
                    snip = 'let ' + snip.replace(/\s+/, '');
                    t = 'v';
                }
            }
            let route = currentClass ? doc[currentModule].c[currentClass] : doc[currentModule];
            if (!route[t]) {
                route[t] = {};
            }
            route[t][dataHead.name] = {
                desc: dataHead.desc,
                snip: cleanTabs(snip)
            }
            extractRecurse(data.substring(dataHead.end + dataBody.length), currentModule, currentClass);
        }
    };

    function extractHead(inp) {
        let descMatch = inp.match(/\/\*\*([\s\S]+?)\*\/.*[\n\r]+/);
        if (!descMatch) {
            return;
        }
        inp = inp.substring(descMatch.index + descMatch[0].length);
        let typeRegex = new RegExp(/type|interface|module|let|function|class|public|constructor|const/),
            typeMatch = inp.match(/.*/)[0].match(typeRegex);
        typeMatch = typeMatch ? typeMatch[0] : '';
        if (typeMatch === 'constructor') {
            nameMatch = 'Class Constructor';
            typeMatch = 'function';
        } else {
            nameMatch = inp
                .replace(typeRegex, '')
                .replace(/export|abstract|readonly/g, '')
                .match(/[a-z0-9_$]+/i)[0];
        }
        if (typeMatch === 'public') {
            let nameEnd = inp.indexOf(nameMatch) + nameMatch.length;
            if (inp.substring(nameEnd).replace(/\s+/, '')[0] === '(') {
                typeMatch = 'function';
            } else {
                typeMatch = 'let';
            }
        }
        let funcMatch = typeMatch === 'function' ? extractFuncDeclaration(inp) : inp.match(/.*/)[0],
            snip = funcMatch.replace('export', '');
        
        return {
            desc: descMatch[1].replace(/^[\n\r]+/, ''),
            type: typeMatch,
            name: nameMatch,
            snip: snip,
            end:  descMatch.index + descMatch[0].length
        }
    };

    function extractFuncDeclaration(inp) {
        let bracketCount = 0;
        for(let i = 0; i < inp.length; i++) {
            if (inp[i] === '(') {
                bracketCount++;
            } else if(inp[i] === ')') {
                bracketCount--;
            } else if (inp[i] === '{' && bracketCount === 0) {
                return inp.substring(0, i + 1);
            }
        }
        console.error('No function declaration found for "' + inp.substr(startPos, 10) + '..."');
    }

    function extractBody(inp) {
        let firstLine = inp.match(/.*/)[0];
        if (!firstLine.match(/\(|\{/)) {
            return firstLine.substr(0, firstLine.length - 1);
        }
        let bracketCount = 0;
        for (let i = 0; i < inp.length; i++) {
            if (inp[i] === '}' || inp[i] === ')') {
                bracketCount--;
                if (bracketCount === 0 && inp[i] === '}') {
                    return inp.substring(0, i + 1);
                }
            } else if (inp[i] === '{' || inp[i] === '(') {
                bracketCount++;
            }
        }
        console.error('No body found for "' + inp.substring(0, 10) + '..."');
    };

    function cleanTabs(inp) {
        let clean = inp.replace(/^\s*/g, '').replace(/[\n\r]+\s*/g, '\n');
        let tabCount = 0;
        for (let i = 0; i < clean.length; i++) {
            if (clean[i] === '{' || clean[i] === '(') {
                tabCount++;
            } else if (clean[i] === '}' || clean[i] === ')') {
                tabCount--;
            } else if (clean[i] === '\n' || clean[i] === '\r') {
                let insertTabs = (clean[i + 1] === '}' || clean[i + 1] === ')') ? Math.max(0, tabCount - 1) : tabCount;
                clean =
                    clean.substring(0, i + 1) +
                    '    '.repeat(insertTabs) +
                    clean.substring(i + 1);
                i += insertTabs * 4;
            }
        }
        return clean;
    }

    extractRecurse(inp, 'common');
    return JSON.stringify(doc, null, '\t');
}
