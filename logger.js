var log4js = require('log4js');
var fs = require('fs');
var util = require('util');

function getLogger(categoryName) {
    var args = arguments;
    var prefix = "";
    for (var i = 1; i < args.length; i++) {
        if(i !== args.length-1)
            prefix = prefix + args[i] + "] [";
        else{
            prefix = prefix + args[i];
        }
    }
    if (typeof categoryName === 'string') {
        // category name is __filename then cut the prefix path
        categoryName = categoryName.replace(process.cwd(), '');
    }
    var logger = log4js.getLogger(categoryName);
    var pLogger = {};
    for (var key in logger) {
        pLogger[key] = logger[key];
    }

    ['log', 'debug', 'info', 'warn', 'error', 'trace', 'fatal'].forEach(function(item) {
        pLogger[item] = function() {
            var p = "";
            if (args.length > 1) {
                p = "[" + prefix;
            }
            if (args.length && process.env.LOGGER_LINE) {
                p = p + ": " + getLine() + "] ";
            } else {
                p = p + "] ";
            }
            if(args.length) {
                arguments[0] = p + arguments[0];
            }
            logger[item].apply(logger, arguments);
        }
    });
    return pLogger;
};


/**
 * Configure the logger.
 * Configure file just like log4js.json.
 *
 * @param  {String|Object} config configure file name or configure object
 * @return {Void}
 */

function configure(config) {
    var filename = config;
    config = config || process.env.LOG4JS_CONFIG;

    if (typeof config === 'string') {
        config = JSON.parse(fs.readFileSync(config, "utf8"));
    }

    if(config && config.lineDebug) {
        process.env.LOGGER_LINE = true;
    }

    // config object could not turn on the auto reload configure file in log4js

    log4js.configure(config);
}


function getLine() {
    var e = new Error();
    // now magic will happen: get line number from callstack
    var line = e.stack.split('\n')[3].split(':')[1];
    return line;
}


module.exports = {
    getLogger: getLogger,
    getDefaultLogger: log4js.getDefaultLogger,

    addAppender: log4js.addAppender,
    loadAppender: log4js.loadAppender,
    clearAppenders: log4js.clearAppenders,
    configure: configure,

    replaceConsole: log4js.replaceConsole,
    restoreConsole: log4js.restoreConsole,

    levels: log4js.levels,
    setGlobalLogLevel: log4js.setGlobalLogLevel,

    layouts: log4js.layouts,
    appenders: log4js.appenders
};