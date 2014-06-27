"use strict";

var _logger = require('./logger');
var util = require('util');


var apps = [];
var appMap = {};
var config = {};
var appModels = {};
var logger = console;
var expressapp = null;

//Load app configurations, and merge into config bject.
function configApp(appConfig) {
    for (var i in appConfig) {
        if (appConfig.hasOwnProperty(i)) {
            config[i] = appConfig[i];
        }
    }
}


function setupDatabase() {
    var conn = config.db.type('default', config.db.opts);
    conn.setup();
    config.db.conn = conn;
}


function setupLogger() {
    if (get('logger')) {
        _logger.configure(get('logger'));
        logger = _logger.getLogger('bicycle', __filename);
    }
}


function setupModels() {
    var models = config.db.models = {};
    //collect models to create.
    apps.forEach(function(app) {
        var appModels = get(app, 'models');
        if (appModels) {
            models[app] = {};
            Object.keys(appModels).forEach(function(key) {
                if (typeof appModels[key] === 'object') {
                    var parentName = key, parentModels = appModels[key];
                    Object.keys(parentModels).forEach(function(parentModelKey) {
                        //model overwrite
                        models[parentName][parentModelKey] = [parentName.replace('-', '_') + '_' + parentModelKey, parentModels[parentModelKey]];
                    })
                } else {
                    models[app][key] = [app.replace('-', '_') + '_' + key, appModels[key]];
                }
            });
        }
    });
    //create models
    Object.keys(models).forEach(function(app) {
        Object.keys(models[app]).forEach(function(modelName) {
            var args = models[app][modelName];
            models[app][modelName] = config.db.conn.model.apply(config.db.conn, args);
        });
    });
}

/**
 * Set up a bicycle app.
 * The Object must contains the attibutes below:
 *    dirname, meaning the root directory of the app.
 *    appName, meaning the name of the app.
 *    viewsdir, meaning the root directory of the views.
 * @param  {Object} appConfig, config module of a bicycle app.
 * @return
 */
function use(appConfig) {
    apps.push(appConfig.appName);
    appMap[appConfig.appName] = appConfig;
    configApp(appConfig);
}


/**
 * Initialize bicycle.
 * Setup database.
 * @param  {express} app
 * @return
 */
function init(app) {
    expressapp = app;
    setupLogger();
    setupDatabase();
    setupModels();
}

/**
 * Get configuration data.
 * @param  {String} optinal, appName
 * @param  {String} name
 * @return {Object}
 */
function get(name) {
    if(arguments.length > 1) {
        return appMap[arguments[0]][arguments[1]] || expressapp.get(name);
    }
    return config[name] || expressapp.get(name);
}


/**
 * Set configuration data. Readonly attribute can not be changed: appName, viewsdir
 * @param  {String} optinal, appName
 * @param  {String} name
 * @param  {String} value
 * @return {Object}
 */
function set(appName, name, value) {
    var _appname = null, _name = null, _value = null;
    if (arguments.length == 1) {
        _name = appName;
        _appname = apps[apps.length - 1];
        _value = name;
    } else {
        _name = name;
        _appname = appName;
        _value = value;
    }
    ["appName", "viewsdir"].forEach(function(index, value) {
        if (_name == value) {
            throw new Error('You can not set a readonly attibute ' + _name);
        }
    })

    appMap[_appname][_name] = _value;
    for (var i = apps.length - 1; i >= 0; i--) {
        if (_name in appMap[apps[i]]) {
            config[_name] = appMap[apps[i]][_name];
        }
    };
}


/**
 * Collects app's routes together.
 * @param  {express Application} app
 * @return
 */
function route(app) {

}


//First, we config self.
use(require('./config.js'));

module.exports = {
    use: use,
    init: init,
    get: get,
    set: set,
    config: config,
    route: route,
    bicycle: module.exports,
    core: {
        workflowFunc: require('./core/workflow'),
    }
}


module.exports.__defineGetter__('models', function() {
    if (config.db) {
        return config.db.models;
    } else {
        throw new Error('bicycle not initialized yet.');
    }
});

module.exports.__defineGetter__('utility', function() {
    return {
        sendmail: require('./utils/email'),
        slugify: require('./utils/slugify')
    }

});