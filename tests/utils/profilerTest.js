var profiler = require('../../utils/profiler');

profiler.enabled  = true;

function main() {
    profiler.tag('start');
    setTimeout(function(){
        profiler.tag('tag1');
    }, 200);
    setTimeout(function(){
        profiler.tag('tag2');
    }, 400);
    setTimeout(function(){
        profiler.tag('tag3');
    }, 500);
    setTimeout(function(){
        profiler.tag('end');
        profiler.print();
    }, 1000);
}


if (require.main === module) {
    main();
}