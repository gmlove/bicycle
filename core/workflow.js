'use strict';

exports = module.exports = function(req, res) {
    var workflow = new (require('events').EventEmitter)();

    workflow.outcome = {
        success: false,
        errors: [],
        errfor: {}
    };

    workflow.req = req;
    workflow.res = res;

    workflow.hasErrors = function() {
        if(!workflow.outcome.errors || !workflow.outcome.errfor) {
            return false;
        }
        return Object.keys(workflow.outcome.errfor).length !== 0 || workflow.outcome.errors.length !== 0;
    };

    workflow.on('exception', function(err) {
        workflow.outcome.errors.push('Exception: '+ err);
        return workflow.emit('response');
    });

    workflow.on('response', function() {
        workflow.outcome.success = !workflow.hasErrors();
        res.send(workflow.outcome);
    });

    return workflow;
};
