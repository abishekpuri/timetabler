module.exports = function(grunt) {
  require("matchdep").filterDev("grunt-*").forEach(grunt.loadNpmTasks);
  grunt.initConfig({
    jshint: {
      files: ['controllers/*.js','public/tests/*.js','models/*.js'],
      options: {
        globals: {
          jQuery: true
        },
      },
    },
    watch: {
      files: ['<%= jshint.files %>'],
      tasks: ['jshint'],
      options: {
        livereload: 5000,
      },
    },
    qunit: {
      all: {
        options: {
          urls: [
            'http://localhost:5000/qtest'
          ]
        }
      }
    },
    concurrent: {
        target: {
            tasks: ['foreman', 'exec:test'],
            options: {
                logConcurrentOutput: true
            }
        }
    },
    exec: {
      docgen: 'jsdoc . -r -c conf.json -d docs --readme README.md',
      start: 'npm run foreman-start; exit 0;',
      test: 'grunt qunit && killall -SIGINT node',
    }
  });
  grunt.registerTask('test',['jshint','concurrent']);
  grunt.registerTask('default', ['jshint', 'exec:start']);
  grunt.registerTask('start', ['exec:docgen','jshint','foreman']);
  grunt.registerTask('foreman', ['exec:start']);
};
