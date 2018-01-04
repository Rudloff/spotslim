/*jslint node: true */
module.exports = function (grunt) {
    'use strict';
    grunt.initConfig(
        {
            jslint: {
                meta: {
                    src: ['*.js']
                },
                js: {
                    src: 'js/*.js'
                }
            },
            jsonlint: {
                manifests: {
                    src: ['*.json'],
                    options: {
                        format: true
                    }
                }
            },
            fixpack: {
                package: {
                    src: 'package.json'
                }
            },
            webpack: {
                build: require('./webpack.config.js')
            },
            watch: {
                js: {
                    files: ['js/*.js'],
                    tasks: ['webpack']
                },
                css: {
                    files: ['css/*.css'],
                    tasks: ['webpack']
                }
            }
        }
    );

    grunt.loadNpmTasks('grunt-jslint');
    grunt.loadNpmTasks('grunt-jsonlint');
    grunt.loadNpmTasks('grunt-fixpack');
    grunt.loadNpmTasks('grunt-webpack');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask('lint', ['jslint', 'fixpack', 'jsonlint']);
    grunt.registerTask('default', ['webpack']);
};
