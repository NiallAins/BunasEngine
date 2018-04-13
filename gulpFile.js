var gulp       = require('gulp'),
    markdown   = require('gulp-markdown-it'),
    concat     = require('gulp-concat'),
    replace    = require('gulp-replace'),
    typescript = require('gulp-typescript');
    tsProject  = typescript.createProject('./dist/tsconfig.json');

gulp.task('condense', function() {
    var saveSpace = [];
    return gulp.src(['./modules/*.ts'])
        .pipe(concat('Bunas.ts'))
        .pipe(replace(/(import .*)|([\n\s]+\/\/.*)/g, ''))
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

gulp.task('markdown', function() {
    return gulp.src('./docs/pages/*.md')
        .pipe(markdown())
        .pipe(gulp.dest(function(f) {
            return f.base;
        }));
});

gulp.task('default', ['compile', 'markdown'], function() {
    gulp.watch('./modules/*.ts', ['condense']);
    gulp.watch('./dist/dev/*', ['compile']);
    gulp.watch('./docs/pages/*.md', ['markdown']);
});