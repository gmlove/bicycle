var config = require('../config');

function Profiler(logger) {
    this.lastTagTime = null;
    this.data = [];
    this.logger = logger || console;
}

var proto = Profiler.prototype;

proto.tag = function(tagName) {
    if(!Profiler.enabled) {
        return;
    }
    var now = new Date().getTime();
    var timespent = this.lastTagTime === null ? 0 : now - this.lastTagTime;
    this.data.push([tagName, timespent]);
    this.logger.info('[%s]: %sms', tagName, timespent);
    this.lastTagTime = now;
}

proto.print = function() {
    this.logger.info('profiled: ');
    for (var i = 0; i < this.data.length; i++) {
        var ele = this.data[i];
        this.logger.info('[%s]: %sms', ele[0], ele[1]);
    }
}

proto.init = function() {
    this.lastTagTime = null;
    this.data = [];
}

var ins = Profiler.ins = new Profiler();

Profiler.enabled = false;

['tag', 'print', 'init'].forEach(function(funcname){
    Profiler[funcname] = ins[funcname].bind(ins);
});

module.exports = Profiler;
