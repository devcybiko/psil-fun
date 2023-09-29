#!/usr/bin/env node

/** 
 * template for a main.js file
 **/

const glstools = require('glstools');
const gprocs = glstools.procs;
const gfiles = glstools.files;
const Logger = require("./psil_logger.js");
const Parser = require('./psil_parse.js');
const Stack = require("./psil_stack.js");
const Operators = require("./psil_ops.js");

module.exports = { main }

function main(_opts) {
    let opts = _opts || gprocs.args("--trace,--verbose,--debug", "infile*");
    let log = new Logger();

    if (opts.trace) log.TRACE = true;
    if (opts.debug) log.DEBUG = true;
    if (opts.verbose) log.INFO = true;
    let parser = new Parser(log);
    let code = gfiles.read(opts.infile);
    let pcode = parser.parse(code);

    let ops = new Operators(log);
    ops.eval_list(pcode)
    if (opts.verbose) {
        log.die(".... DONE ..." + "\n");
    }
}

if (module.id === ".") {
    return main();
}
