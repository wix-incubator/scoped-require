'use strict';
module.exports = function (grunt) {
  // Show elapsed time at the end
  require('time-grunt')(grunt);
  // Load all grunt tasks
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    mochacli: {
      all: ['test/*.js']
    },
    watch: {
      js: {
        files: '<%= jshint.js.src %>',
        tasks: ['mochacli']
      },
      test: {
        files: '<%= jshint.test.src %>',
        tasks: ['mochacli']
      }
    }
  });

  grunt.registerTask('default', ['mochacli']);
};
