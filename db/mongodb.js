'use strict';

var base = require('./base.js'),
	mongoose = require('mongoose'),
	util = require('util'),
    bicycle = require('../index'),
    logger = require('../logger').getLogger('bicycle', __filename);

function MongoDatabase(name, opts) {
	base.BaseDatabase.call(name);
	this.opts = opts;
    if(process.env.ENV == 'test'){
        opts.uri = opts.uri + '_test';
    }
    logger.debug('create mongodb connection: ', opts.uri);
	this.connection = mongoose.createConnection(opts.uri);
	var errorHandler = opts.error || console.error.bind(console, 'mongoose connection error: ');
	this.connection.on('error', errorHandler);
}

util.inherits(MongoDatabase, base.BaseDatabase);

MongoDatabase.prototype.setup = function() {
}

/**
 * static method of a Database class.
 * @param {String} name model name
 * @param {Schema} [schema]
 * @param {String} [collection] name (optional, induced from model name)
 * @param {Boolean} [skipInit] whether to skip initialization (defaults to false)
 * @return {Model} model of a mongoose database
 * @api public
 */
MongoDatabase.prototype.model = function() {
    if (arguments.length > 1) {
        var schema = arguments[1];
        if (typeof schema === 'function' && ! (schema instanceof mongoose.Schema)){
            schema = schema(bicycle, mongoose);
            arguments[1] = schema;
        }
    }
    logger.debug('create Model: ', arguments[0]);
    return this.connection.model.apply(this.connection, arguments);
}

exports = module.exports = function(name, opts) {
	return new MongoDatabase(name, opts);
}