'use strict';

var backends = {
    'mongodb': require('./mongodb.js')
};

exports = module.exports = {
    backends: backends,
    mongoose: require('mongoose')
};

