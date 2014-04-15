#!/usr/bin/env node

/**
 * Module dependencies.
 */
var fs = require('fs'),
    os = require('os'),
    path = require('path'),
    util = require('util'),
    cliff = require('cliff'),
    mkdirp = require('mkdirp'),
    exec = require('child_process').exec,
    spawn = require('child_process').spawn,
    version = require('../package.json').version,
    program = require('commander');

/**
 *  Constant Variables
 */
var CUR_DIR = process.cwd();
var COMMAND_ERROR = 'Illegal command format. Use `pomelo --help` to get more info.\n'.red;

program.version(version);

program.command('init [path]')
    .description('create a new application')
    .action(function(path) {
        init(path || CUR_DIR);
    });

program.command('compile')
    .description('compile dust templates and generate html files, use `bicycle compile login/login dashborad`')
    .option('-d, --dirname <dirname>', 'views directory name')
    .option('-t, --template <template>', 'template html file path')
    .option('-v, --viewbasepath <viewbasepath>', 'view basepath of the dust files')
    .option('-b, --databasepath <databasepath>', 'data basepath of the dust files')
    .action(function(args) {
        var args = [].slice.call(arguments, 0);
        var opts = args[args.length - 1];
        opts.htmlfiles = args.slice(0, -1);
        compile(opts);
    });

program.command('*')
    .action(function() {
        console.log(COMMAND_ERROR);
    });

program.parse(process.argv);

/**
 * Init application at the given directory `path`.
 *
 * @param {String} path
 */
function init(path) {
    console.log(INIT_PROJ_NOTICE);
    connectorIsWs(function(isWs) {
        emptyDirectory(path, function(empty) {
            if(empty) {
                process.stdin.destroy();
                createApplicationAt(path, isWs);
            } else {
                confirm('Destination is not empty, continue? (y/n) [no] ', function(force) {
                    process.stdin.destroy();
                    if(force) {
                        createApplicationAt(path, isWs);
                    } else {
                        abort('Fail to init a project'.red);
                    }
                });
            }
        });
    });
}


function compile(opts) {
    require('../compiler').compile(opts);
}

/**
 * Create directory and files at the given directory `path`.
 *
 * @param {String} ph
 */
function createApplicationAt(ph, isWs) {
  var name = path.basename(path.resolve(CUR_DIR, ph));
  copy(path.join(__dirname, '../template/'), ph);
  mkdir(path.join(ph, 'game-server/logs'));
  mkdir(path.join(ph, 'shared'));
  setTimeout(function() {
    if (isWs) {
      // use websocket
      var unlinkFiles = ['game-server/app.js.sio',
                         'web-server/public/index.html.sio',
                         'web-server/public/js/lib/pomeloclient.js',
                         'web-server/public/js/lib/socket.io.js'];
      for(var i = 0; i < unlinkFiles.length; ++i) {
        fs.unlinkSync(path.resolve(ph, unlinkFiles[i]));
      }
    } else {
      // use socket.io
      fs.unlinkSync(path.resolve(ph, 'game-server/app.js'));
      fs.renameSync(path.resolve(ph, 'game-server/app.js.sio'),
                    path.resolve(ph, 'game-server/app.js'));

      fs.unlinkSync(path.resolve(ph, 'web-server/public/index.html'));
      fs.renameSync(path.resolve(ph, 'web-server/public/index.html.sio'),
                    path.resolve(ph, 'web-server/public/index.html'));

      // rmdir -r
      var rmdir = function(dir) {
        var list = fs.readdirSync(dir);
        for(var i = 0; i < list.length; i++) {
          var filename = path.join(dir, list[i]);
          var stat = fs.statSync(filename);
          if(filename === "." || filename === "..") {
          } else if(stat.isDirectory()) {
            rmdir(filename);
          } else {
            fs.unlinkSync(filename);
          }
        }
        fs.rmdirSync(dir);
      };

      rmdir(path.resolve(ph, 'web-server/public/js/lib/build'));
      rmdir(path.resolve(ph, 'web-server/public/js/lib/local'));
      fs.unlinkSync(path.resolve(ph, 'web-server/public/js/lib/component.json'));
    }
    var replaceFiles = ['game-server/app.js',
                        'game-server/package.json',
                        'web-server/package.json'];
    for(var j = 0; j < replaceFiles.length; j++) {
      var str = fs.readFileSync(path.resolve(ph, replaceFiles[j])).toString();
      fs.writeFileSync(path.resolve(ph, replaceFiles[j]), str.replace('$', name));
    }
    var f = path.resolve(ph, 'game-server/package.json');
    var content = fs.readFileSync(f).toString();
    fs.writeFileSync(f, content.replace('#', version));
  }, TIME_INIT);
}

/**
 * Start application.
 *
 * @param {Object} opts options for `start` operation
 */
function start(opts) {
  var absScript = path.resolve(opts.directory, 'app.js');
  if (!fs.existsSync(absScript)) {
    abort(SCRIPT_NOT_FOUND);
  }

  var logDir = path.resolve(opts.directory, 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdir(logDir);
  }

  var ls;
  if (opts.daemon) {
    ls = spawn(process.execPath, [absScript, 'env=' + opts.env], {detached: true, stdio: 'ignore'});
    ls.unref();
    console.log(DAEMON_INFO);
    process.exit(0);
  } else {
    ls = spawn(process.execPath, [absScript, 'env=' + opts.env]);
    ls.stdout.on('data', function(data) {
      console.log(data.toString());
    });
    ls.stderr.on('data', function(data) {
      console.log(data.toString());
    });
  }
}

/**
 * List pomelo processes.
 *
 * @param {Object} opts options for `list` operation
 */
function list(opts) {
  var id = 'pomelo_list_' + Date.now();
  connectToMaster(id, opts, function(client) {
    client.request(co.moduleId, {signal: 'list'}, function(err, data) {
      if(err) {
        console.error(err);
      }
      var servers = [];
      for(var key in data.msg) {
        servers.push(data.msg[key]);
      }
      var comparer = function(a, b) {
        if (a.serverType < b.serverType) {
          return -1;
        } else if (a.serverType > b.serverType) {
          return 1;
        } else if (a.serverId < b.serverId) {
          return -1;
        } else if (a.serverId > b.serverId) {
          return 1;
        } else {
          return 0;
        }
      };
      servers.sort(comparer);
      var rows = [];
      rows.push(['serverId', 'serverType', 'pid', 'heapUsed(M)', 'uptime(m)']);
      servers.forEach(function(server) {
        rows.push([server.serverId, server.serverType, server.pid, server.heapUsed, server.uptime]);
      });
      console.log(cliff.stringifyRows(rows, ['red', 'blue', 'green', 'white', 'yellow']));
      process.exit(0);
    });
  });
}

/**
 * Check if the given directory `path` is empty.
 *
 * @param {String} path
 * @param {Function} fn
 */
function emptyDirectory(path, fn) {
    fs.readdir(path, function(err, files) {
        if(err && 'ENOENT' !== err.code) {
            abort(FILEREAD_ERROR);
        }
        fn(!files || !files.length);
    });
}

/**
 * Prompt confirmation with the given `msg`.
 *
 * @param {String} msg
 * @param {Function} fn
 */
function confirm(msg, fn) {
    prompt(msg, function(val) {
        fn(/^ *y(es)?/i.test(val));
    });
}

/**
 * Prompt input with the given `msg` and callback `fn`.
 *
 * @param {String} msg
 * @param {Function} fn
 */
function prompt(msg, fn) {
    if(' ' === msg[msg.length - 1]) {
        process.stdout.write(msg);
    } else {
        console.log(msg);
    }
    process.stdin.setEncoding('ascii');
    process.stdin.once('data', function(data) {
        fn(data);
    }).resume();
}

/**
 * Exit with the given `str`.
 *
 * @param {String} str
 */
function abort(str) {
    console.error(str);
    process.exit(1);
}

/**
 * Copy template files to project.
 *
 * @param {String} origin
 * @param {String} target
 */
function copy(origin, target) {
  if(!fs.existsSync(origin)) {
    abort(origin + 'does not exist.');
  }
  if(!fs.existsSync(target)) {
    mkdir(target);
    console.log('   create : '.green + target);
  }
  fs.readdir(origin, function(err, datalist) {
    if(err) {
      abort(FILEREAD_ERROR);
    }
    for(var i = 0; i < datalist.length; i++) {
      var oCurrent = path.resolve(origin, datalist[i]);
      var tCurrent = path.resolve(target, datalist[i]);
      if(fs.statSync(oCurrent).isFile()) {
        fs.writeFileSync(tCurrent, fs.readFileSync(oCurrent, ''), '');
        console.log('   create : '.green + tCurrent);
      } else if(fs.statSync(oCurrent).isDirectory()) {
        copy(oCurrent, tCurrent);
      }
    }
  });
}

/**
 * Mkdir -p.
 *
 * @param {String} path
 * @param {Function} fn
 */
function mkdir(path, fn) {
  mkdirp(path, 0755, function(err){
    if(err) {
      throw err;
    }
    console.log('   create : '.green + path);
    if(typeof fn === 'function') {
      fn();
    }
  });
}

