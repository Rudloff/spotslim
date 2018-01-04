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
            }
        }
    );

    grunt.loadNpmTasks('grunt-jslint');
    grunt.loadNpmTasks('grunt-jsonlint');
    grunt.loadNpmTasks('grunt-fixpack');
    grunt.loadNpmTasks('grunt-webpack');

    grunt.registerTask('lint', ['jslint', 'fixpack', 'jsonlint']);
    grunt.registerTask('default', ['webpack']);
};
