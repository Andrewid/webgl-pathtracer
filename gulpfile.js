var gulp = require('gulp');
var concat = require('gulp-concat-util');
var indent = require('gulp-indent');
var wrap = require('gulp-wrap');
var jshint = require('gulp-jshint');
var rename = require('gulp-rename');
var shell = require('gulp-shell');
var uglify = require('gulp-uglify');

var del = require('del');
var map = require('vinyl-map');

var glslify = require('glslify');

var target = 'glpt.js';
var target_minified = 'glpt.min.js';


gulp.task('jshint:src', function() {

  return gulp.src('src/**/*.js')

    .pipe(jshint())
    .pipe(jshint.reporter('default'))
});

gulp.task('jshint:dist', ['jshint:src', 'build'], function() {

  return gulp.src('dist/' + target)

    .pipe(jshint())
    .pipe(jshint.reporter('default'))
});


gulp.task('test');


gulp.task('clean:dist', function () {

  return del('dist/*');
});


gulp.task('aggregate:shaders', function() {

  return gulp.src([

    'src/shaders/vertex.glsl',
    'src/shaders/fragment.glsl'
  ], {read: false})

    .pipe(shell([
      'echo aggregate:shader <%= file.path %>',
      'glslify <%= file.path %> -o <%= glsl_out(file.path) %>'
    ], {

      templateData: {

        glsl_out: function(filename) { return filename.replace('.glsl', '.out.glsl'); }
      }
    }));
});

gulp.task('transpile:shaders', ['aggregate:shaders'], function() {

  return gulp.src('src/shaders/*.out.glsl')

    .pipe(map(function(code, filename) {

      var shader_type = filename.slice(

        filename.lastIndexOf('\\') + 1,
        filename.indexOf('.')
      );

      code = code.toString().replace('\r', '\n');

      return 'var ' + shader_type.toUpperCase() + '_SHADER_SOURCE = [\n  ' +

        code.split('\n')
            .map(function(x) { return '"' + x.replace(/\s+$/, '') + '"'; })
            .join(',\n  ') +
        '].join(\'\\n\');';
    }))

    .pipe(rename(function (path) {

      path.basename = path.basename.replace('.out', '');
      path.extname = '.js';
    }))

    .pipe(gulp.dest('src/shaders/'));
});


gulp.task('concat:dist', ['clean:dist', 'transpile:shaders'], function() {

  return gulp.src([

    'src/shaders/vertex.js',
    'src/shaders/fragment.js',

    'src/js/TextureUtils.js',

    'src/js/Primitive.js',
    'src/js/Material.js',
    'src/js/Light.js',
    'src/js/Stratifier.js',

    'src/js/Screen.js',
    'src/js/Tracer.js',
    'src/js/Composer.js',

    'src/js/index.js'
  ])

    .pipe(concat(target, {

      process: function (src) {

        var has_header = src.slice(0, 3) === '/**';
        var i = src.indexOf('*/');

        if (has_header && i !== -1) {

          return src.slice(i + 2).trim() + '\n';
        }

        else { return src + '\n'; }
      }
    }))

    .pipe(gulp.dest('dist'));
});


gulp.task('wrap:dist', ['concat:dist'], function() {

  return gulp.src('dist/' + target)

    .pipe(indent({

      tabs: false,
      amount: 2
    }))

    .pipe(wrap(

      '/**\n' +
      ' * @author Raoul Harel\n' +
      ' * @license The MIT license (LICENSE.txt)\n' +
      ' * @copyright 2015 Raoul Harel\n' +
      ' * @url https://github.com/rharel/webgl-pathtracer\n' +
      ' */\n' +
      '\n\n' +
      '(function () {\n\n' +
      '<%= contents %>\n' +
      '})();\n'
    ))

    .pipe(gulp.dest('dist'));
});

gulp.task('compress', ['wrap:dist'], function() {

  return gulp.src('dist/' + target)

    .pipe(uglify())
    .pipe(rename(function(path) { path.extname = '.min.js'; }))
    .pipe(gulp.dest('dist'));
});

gulp.task('build', ['wrap:dist']);
gulp.task('release', ['build', 'compress']);

gulp.task('default', ['build', 'jshint:dist']);