module.exports = function(grunt) {

  require("load-grunt-tasks")(grunt);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    "babel": {
      options: {
        sourceMap: true,
        plugins: ["transform-react-jsx"],
        presets: ['babel-preset-es2015']
      },
      dist: {
        files: {
          "assets/build/irc-client.js": "assets/src/irc-client.jsx",
          "assets/build/command-box.js": "assets/src/command-box.jsx"
        }
      }
    },
    "uglify": {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        files: {
          "assets/build/irc-client.min.js": "assets/build/irc-client.js",
          "assets/build/command-box.min.js": "assets/build/command-box.js"
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.registerTask('default', ['babel', 'uglify']);
};
