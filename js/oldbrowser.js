/*jslint browser: true, node: true*/
/*global Promise, window*/

/**
 * oldbrowsers module constructor.
 * @return {Object} oldbrowsers module
 */
function oldbrowsers() {
    'use strict';

    /**
     * Display an error if Promise is not supported.
     * @return {Void}
     */
    function testPromise() {
        if (typeof Promise !== 'function') {
            document.getElementsByTagName('body')[0].innerHTML = 'Your browser does not support <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise">promises</a>. Please update your browser.';
        }
    }

    /**
     * Init checks for old browsers
     * @return {Void}
     */
    function init() {
        testPromise();
    }

    return {
        init: init
    };
}

module.exports = oldbrowsers();
