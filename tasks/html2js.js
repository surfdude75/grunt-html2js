/*
 * grunt-html2js
 * https://github.com/karlgoldstein/grunt-html2js
 *
 * Copyright (c) 2013 Karl Goldstein
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  var path = require('path');
  var minify = require('html-minifier').minify;

  var escapeContent = function(content, quoteChar, indentString) {
    var bsRegexp = new RegExp('\\\\', 'g');
    var quoteRegexp = new RegExp('\\' + quoteChar, 'g');
    var nlReplace = '\\n' + quoteChar + ' +\n' + indentString + indentString + quoteChar;
    return content.replace(bsRegexp, '\\\\').replace(quoteRegexp, '\\' + quoteChar).replace(/\r?\n/g, nlReplace);
  };

  // convert Windows file separator URL path separator
  var normalizePath = function(p) {
    if ( path.sep !== '/' ) {
      p = p.replace(/\\/g, '/');
    }
    return p;
  };

  // Warn on and remove invalid source files (if nonull was set).
  var existsFilter = function(filepath) {

    if (!grunt.file.exists(filepath)) {
      grunt.log.warn('Source file "' + filepath + '" not found.');
      return false;
    } else {
      return true;
    }
  };

  // return template content
  var getContent = function(filepath, quoteChar, indentString, htmlmin, process) {
    var content = grunt.file.read(filepath);

    // Process files as templates if requested.
    if (typeof process === "function") {
      content = process(content, filepath);
    } else if (process) {
      if (process === true) {
        process = {};
      }
      content = grunt.template.process(content, process);
    }

    if (Object.keys(htmlmin).length) {
      try {
        content = minify(content, htmlmin);
      } catch (err) {
        grunt.warn(filepath + '\n' + err);
      }
    }

    return escapeContent(content, quoteChar, indentString);
  };

  // compile a template to an angular module
  var compileTemplate = function(filepath, quoteChar, indentString, useStrict, htmlmin, process) {
    var content = getContent(filepath, quoteChar, indentString, htmlmin, process);
    var module = 'exports.templates[' + quoteChar + filepath + quoteChar + '] = ' + quoteChar + content + quoteChar + ';';

    return module;
  };

  // compile a template to an angular module
  var compileCoffeeTemplate = function(filepath, quoteChar, indentString, htmlmin, process) {
    var content = getContent(filepath, quoteChar, indentString, htmlmin, process);
    var module = '_exports.templates[' + quoteChar + filepath + quoteChar + '] = ' + quoteChar + content + quoteChar + ';';

    return module;
  };

  grunt.registerMultiTask('html2js', 'Compiles html templates to JavaScript.', function() {

    var options = this.options({
      base: 'views',
      quoteChar: '"',
      fileHeaderString: '',
      fileFooterString: '',
      indentString: '  ',
      target: 'js',
      htmlmin: {},
      process: false
    });

    var counter = 0;

    // generate a separate module
    this.files.forEach(function(f) {

      // f.dest must be a string or write will fail

      var moduleNames = [];

      var modules = f.src.filter(existsFilter).map(function(filepath) {

        if (options.target === 'js') {
          return compileTemplate(filepath, options.quoteChar, options.indentString, options.useStrict, options.htmlmin, options.process);
        } else if (options.target === 'coffee') {
          return compileCoffeeTemplate(filepath, options.quoteChar, options.indentString, options.htmlmin, options.process);
        } else {
          grunt.fail.fatal('Unknow target "' + options.target + '" specified');
        }

      });

      counter += modules.length;
      modules  = modules.join('\n' + options.indentString);

      var fileHeader = options.fileHeaderString !== '' ? options.fileHeaderString + '\n' : '';
      var fileFooter = options.fileFooterString !== '' ? options.fileFooterString + '\n' : '';
      var strict = (options.useStrict) ? options.indentString + options.quoteChar + 'use strict' + options.quoteChar + ';\n' : '';
      var bundle = "";

      if (options.target === 'js') {
        bundle = ';(function (exports, undefined) {\n' + strict + options.indentString + modules + '\n})(this);';
      } else if (options.target === 'coffee') {
        bundle = '((_exports, _undefined) -> \n' + strict + options.indentString + modules + '\n' + options.indentString + 'return;\n)(this);';
      }

      grunt.file.write(f.dest, grunt.util.normalizelf(fileHeader + bundle + fileFooter));
    });
    //Just have one output, so if we making thirty files it only does one line
    grunt.log.writeln("Successfully converted "+(""+counter).green +
                      " html templates to " + options.target + ".");
  });
};
