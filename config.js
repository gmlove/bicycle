'use strict';

exports.companyName = 'Bicycle, Inc.';
exports.projectName = 'Bicycle Admin';
exports.systemEmail = 'brightlgm.serv@gmail.com';
exports.smtp = {
    from: {
        name: process.env.SMTP_FROM_NAME || exports.projectName +' Website',
        address: process.env.SMTP_FROM_ADDRESS || 'brightlgm.serv@gmail.com'
    },
    credentials: {
        user: process.env.SMTP_USERNAME || 'brightlgm.serv@gmail.com',
        password: process.env.SMTP_PASSWORD || '415890537',
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        ssl: true
    }
};
exports.port = process.env.PORT || 3000;
exports.dbStorage = {
    mongodb: {
        uri: process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'localhost/bicycle'
    }
};
exports.appName = 'bicycle';
exports.version = '0.0.1';