'use strict';

var util = require('util');

function Database(name) {
    this.name = name;
}

Database.prototype.setup = function() {
    throw new Error('Not Implemented.');
}

Database.prototype.execute = function() {
    throw new Error('Not Implemented.');
}

Database.prototype.Model = function() {
    throw new Error('Not Implemented.');
}

function BaseDatabase(name) {
	Database.call(this, name);
}

util.inherits(BaseDatabase, Database);

exports = module.exports = {
	Database: Database,
	BaseDatabase: BaseDatabase
}