"use strict";
var gulp = require('gulp'),
  jshint = require('gulp-jshint'),
  debug = require('gulp-debug'),
  babel = require('gulp-babel'),
  uglify = require('gulp-uglify'),
  insert = require('gulp-insert'),
  rename = require('gulp-rename'),
  stripComments = require('gulp-strip-comments'),
  deleteLines = require('gulp-delete-lines'),
  replace = require('gulp-replace'),
  webserver = require('gulp-webserver'),
  fs = require('fs');

const PACKAGE = require('./package.json');
//TODO - update this
const ATTIBUTION = "/* Version "+PACKAGE.version+" active-reading-time (https://github.com/ecaroth/active-reading-time-jquery-plugin), Authored by Evan Carothers (https://github.com/ecaroth) */"+"\n\n";
      FILENAME = "active-reading-time.jquery.js";

const DETECT_MOBILE_JS = fs.readFileSync('./dev/vendor/detectmobilebrowser.js','utf8'),
      COOKIE_MONSTER_JS = fs.readFileSync('./dev/vendor/cookiemonster.js','utf8');

const DIST_DIR = "dist",
      DEV_DIR = "dev",
      FILE_SRC = "./dev/active-reading-time.js",
      MIN_FILENAME = "active-reading-time.jquery.min.js",
      PROD_FILENAME = "active-reading-time.jquery.js",
      DEV_FILENAME = "active-reading-time.dev.js"

const MODULES_JS_SRC = {
  ui:       './dev/modules/ui.module.js',
  page:     './dev/modules/page.module.js',
  readtime: './dev/modules/readTime.module.js',
  utils:    './dev/modules/utils.module.js'
};

function getModules(){
  return {
    ui:       fs.readFileSync(MODULES_JS_SRC.ui, 'utf8'),
    page:     fs.readFileSync(MODULES_JS_SRC.page, 'utf8'),
    readtime: fs.readFileSync(MODULES_JS_SRC.readtime, 'utf8'),
    utils:    fs.readFileSync(MODULES_JS_SRC.utils, 'utf8')
  }
}

gulp.task('lint', function(){
  return gulp.src(
      [FILE_SRC].concat(Object.keys(MODULES_JS_SRC).map(function(k){return MODULES_JS_SRC[k]}))
    )
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(jshint.reporter('fail'))
});

gulp.task('build', ['build_prod','build_prod_min','build_dev']);

function addModulesAndLibsAndTranspile(task){
  var modules = getModules();

  return task
    .pipe( replace( '<<DETECT_MOBILE_JS>>', DETECT_MOBILE_JS) )
    .pipe( replace( '<<COOKIE_MONSTER_JS>>', COOKIE_MONSTER_JS) )
    .pipe( replace( '<<MODULE_UTILS_JS>>', modules.utils) )
    .pipe( replace( '<<MODULE_UI_JS>>', modules.ui) )
    .pipe( replace( '<<MODULE_PAGE_JS>>', modules.page) )
    .pipe( replace( '<<MODULE_READTIME_JS>>', modules.readtime) )
    .pipe( deleteLines({
      filters: [/\'use strict\'/g]
    }) )
    .pipe( insert.prepend('"use strict";') )
    .pipe( babel({
      plugins: [
        "transform-es2015-shorthand-properties",
        "check-es2015-constants",
        "transform-es2015-arrow-functions",
        "transform-es2015-block-scoped-functions",
        "transform-es2015-block-scoping",
        "transform-es2015-function-name",
        "transform-es2015-literals",
        "transform-es2015-parameters"
      ]
    }) );
}

gulp.task('build_prod_min', ['lint'], function(){
  var task = gulp.src(FILE_SRC,{base:'./dev'})
    .pipe( deleteLines({
      filters: [/\*\*REM\*\*/g]
    }) );
  
  return addModulesAndLibsAndTranspile(task)
    .pipe( uglify({mangle:false,preserveComments:false,compress:true}) )
    .pipe( rename(MIN_FILENAME) )
    .pipe( insert.prepend(ATTIBUTION) )
    .pipe( gulp.dest(DIST_DIR) );
});

gulp.task('build_prod', ['lint'], function(){
  var task = gulp.src(FILE_SRC,{base:'./dev'})
    .pipe( deleteLines({
      filters: [/\*\*REM\*\*/g]
    }) );

  return addModulesAndLibsAndTranspile(task)
    .pipe( stripComments() )
    .pipe( rename(PROD_FILENAME) )
    .pipe( insert.prepend(ATTIBUTION) )
    .pipe( gulp.dest(DIST_DIR) );
});

gulp.task('build_dev', ['lint'], function(){
  var task = gulp.src(FILE_SRC,{base:'./dev'});

  return addModulesAndLibsAndTranspile(task)
    .pipe( rename(DEV_FILENAME) )
    .pipe( gulp.dest(DEV_DIR) );
});

gulp.task('dev', ['dev_webserver'], function () {
  return gulp.watch(
    [FILE_SRC].concat(Object.keys(MODULES_JS_SRC).map(function(k){return MODULES_JS_SRC[k]})),
    ['build_dev']
  );
});

gulp.task('dev_webserver', ['build_dev'], function(){
  return gulp.src(['dist','dev','test'])
      .pipe(webserver({
        port: 3004
      })
    );
});