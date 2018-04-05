let gulp       = require('gulp'),
    markdown   = require('gulp-markdown-it'),
    typescript = require('gulp-typescript'),
    uglify     = require('gulp-uglify'),
    concat     = require('gulp-concat');

gulp.task('compile', function () {
    gulp.src('./modules/*.ts')
        .pipe(typescript({
            outFile         : 'Bunas.js',
            module          : 'amd',
            target          : 'es5',
            sourceMap       : true,
            removeComments  : true
        }))
        .pipe(gulp.dest('./modules'));
});


gulp.task('concat', ['compile'], function() {
    gulp.src(['./modules/require.js', './modules/Bunas.js'])
        .pipe(concat('Bunas.js'))
        .pipe(gulp.dest('./production/dev'));
});

gulp.task('build', ['compile'], function() {
        gulp.src('./production/dev/Bunas.js')
            .pipe(uglify('Bunas.js'))
            .pipe(gulp.dest('./production/dev'));
});

gulp.task('markdown', function() {
    return gulp.src('./docs/pages/*.md')
        .pipe(markdown())
        .pipe(gulp.dest(function(f) {
            return f.base;
        }));
});

gulp.task('default', ['build', 'markdown'], function() {
    gulp.watch('./modules/*.ts', ['build']);
    gulp.watch('./docs/pages/*.md', ['markdown']);
});