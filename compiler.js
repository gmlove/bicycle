'use strict';

var fs = require('fs'),
    dust = require('dustjs-linkedin'),
    logger = require('./logger').getLogger('bicycle', __filename),
    util = require('util'),
    path = require('path');

function mergeTemplates() {
}

function walk(dir) {
    var results = [];
    var list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        var stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            results.push(file);
        }
    });
    return results;
}

function parseParentDustName(content) {
    var reg = /\s*\{\s*>\s*['"]([^'"]*?)["']\s*\/\s*\}\s*/;
    var idx = 0;
    while(true) {
        var idx1 = content.indexOf('\n', idx);
        if (idx1 == -1) {
            logger.error('parseParentDustName failed.');
            logger.error(content);
            throw new Error('parseParentDustName failed.');
        }
        var line = content.substr(idx, idx1).trim();
        if (line) {
            var m = line.match(reg);
            if (m) {
                // found parent dust
                return m[1];
            } else {
                // no parent dust
                return null;
            }
        }
        idx = idx1 + 1;
    }
}

function relativePath(path, pathRelativeTo) {
    var sepPath = path.split('/');
    var sepRela = pathRelativeTo.split('/');
    var idx = 0;
    while(sepRela[idx] == sepPath[idx]) {
        idx++;
        if (idx >= sepRela.length || idx >= sepPath.length) {
            break;
        }
    }
    sepPath = sepPath.slice(idx);
    sepRela = sepRela.slice(idx);
    for (var i = sepRela.length - 2; i >= 0; i--) {
        sepRela[i] = '..';
    };
    sepRela.pop();
    sepRela = sepRela.concat(sepPath);
    return sepRela.join('/');
}

function compile(opts) {
    var dirname = opts.dirname || process.cwd();
    dirname = dirname[dirname.length - 1] == '/' ? dirname : dirname + '/';
    var template = opts.template;
    var htmlfiles = opts.htmlfiles;
    var webbasepath = opts.viewbasepath || dirname;
    var databasepath = opts.databasepath;
    webbasepath = webbasepath[webbasepath.length - 1] == '/' ? webbasepath : webbasepath + '/';

    //check parameter
    if (!fs.statSync(dirname).isDirectory()) {
        logger.error('dirname must be a directory: dirname=%s', dirname);
        throw new Error('dirname must be a directory');
    }
    if (fs.statSync(template).isDirectory()) {
        logger.error('template must be a html file: template=%s', template);
        throw new Error('template must be a html file');
    }

    //filter dust templates
    var dustfiles = walk(dirname).filter(function(ele) {
        return /^.*\.dust$/.test(ele);
    });
    logger.debug('dust files: ', dustfiles.join(', '));

    //construct a dustobj
    var dustdict = {};
    dustfiles.forEach(function(file) {
        var content = fs.readFileSync(file).toString();
        //filename as key
        dustdict[file] = {
            content: content,
            parent: parseParentDustName(content),
            name: file.substr(dirname.length),
            compiled: false
        };
        logger.debug('dustobj: key=%s, parent=%s, name=%s', file, dustdict[file].parent, dustdict[file].name);
    });

    //compiles *.dust into *.dust.js
    while(true) {
        var compiled = false;
        Object.keys(dustdict).forEach(function(key) {
            var dustobj = dustdict[key];
            if (!dustobj.compiled) {
                if (dustobj.parent) {
                    if (!dustdict[dirname + dustobj.parent]) {
                        throw new Error(util.format('parent of template file does not exists: template=%s, parent=%s', dustobj.name, dustobj.parent));
                    } else if (dustdict[dirname + dustobj.parent].compiled) {
                        logger.debug('compile file: file=%s.js, dustkey=%s', key, dustobj.name);
                        //TODO: check if file exists and let user choose if overwrite
                        fs.writeFileSync(
                            key + '.js',
                            dust.compile(fs.readFileSync(key).toString(), dustobj.name)
                            );
                        dustobj.compiled = true;
                        compiled = true;
                    }
                } else {
                    logger.debug('compile file: file=%s.js, dustkey=%s', key, dustobj.name);
                    //TODO: check if file exists and let user choose if overwrite
                    fs.writeFileSync(
                        key + '.js',
                        dust.compile(fs.readFileSync(key).toString(), dustobj.name)
                        );
                    dustobj.compiled = true;
                    compiled = true;
                }
            }
        });
        if (!compiled) {
            break;
        }
    }

    //construct template required data
    var templateRealpath = fs.realpathSync(template);
    Object.keys(dustdict).forEach(function(key) {
        var dustobj = dustdict[key];
        var jsfiles = [];
        var jsfile = dustobj.name + '.js';
        var addParentJsFileRecursively = function(dustobj) {
            if (!dustobj.parent) {
                jsfiles.push(relativePath(dustobj.name, jsfile) + '.js');
            } else {
                addParentJsFileRecursively(dustdict[dirname + dustobj.parent]);
                jsfiles.push(relativePath(dustobj.name, jsfile) + '.js');
            }
        }
        addParentJsFileRecursively(dustobj);
        jsfiles[jsfiles.length - 1] = jsfile.substr(jsfile.lastIndexOf('/') + 1);

        dustobj['__base_view_path__'] = webbasepath;
        dustobj['__base_data_path__'] = databasepath;
        dustobj['__compiled_dust_files__'] = jsfiles.map(function(ele) {
            return util.format('<script src="%s"></script>', ele);
        });
        dustobj['__compiled_dust_files__'] = dustobj['__compiled_dust_files__'].join('\n');
        var jsfileRealpath = fs.realpathSync(dirname + jsfile);
        dustobj['__relative_to__'] = relativePath(templateRealpath, jsfileRealpath);
        dustobj['__relative_to__'] = dustobj['__relative_to__'].substr(0, dustobj['__relative_to__'].lastIndexOf('/') + 1);
        logger.debug('template required data: jsfile=%s, __base_view_path__=%s, __base_data_path__=%s, __compiled_dust_files__=%s, __relative_to__=%s',
            jsfile, dustobj['__base_view_path__'], dustobj['__base_data_path__'], dustobj['__compiled_dust_files__'], dustobj['__relative_to__']);
    });

    //replace template data and generate html files
    var keywords = ['__relative_to__', '__base_view_path__', '__base_data_path__', '__compiled_dust_files__'];
    var html_template = fs.readFileSync(templateRealpath).toString();
    htmlfiles.forEach(function(file) {
        var filepath = dirname + file;
        var dustobj = dustdict[filepath + '.dust'];
        var handled_template = html_template;
        keywords.forEach(function(ele) {
            logger.debug('generate file, replace keyword: file=%s, key=%s, value=%s', filepath, ele, dustobj[ele]);
            handled_template = handled_template.replace(new RegExp('{\s*' + ele + '\s*}', 'g'), dustobj[ele]);
        });
        logger.info('writing file: %s', filepath + '.html');
        fs.writeFileSync(filepath + '.html', handled_template);
    });
}


module.exports = {
    compile: compile,
    relativePath: relativePath
}