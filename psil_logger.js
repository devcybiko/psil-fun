const { psilify } = require("./psil_util.js");

class Logger {
    constructor(symbols, stack) {
        this.line = 1;
        this.DEBUG = false;
        this.INFO = false;
        this.TRACE = true;
        this.stack = stack;
        this.symbols = symbols || {};
    }
    info() {
        if (this.INFO) console.log("info", this.line, ...arguments);
    }
    debug() {
        if (this.DEBUG) console.log("debug:", this.line, ...arguments);
    }
    trace() {
        if (this.TRACE) console.log("trace:", this.line, ...arguments);
    }
    print() {
        console.log(...arguments);
    }
    die() {
        console.error("DIE:", this.line, ...arguments)
        console.error(psilify(this.stack.stack), "\n", JSON.stringify(this.symbols, null, 2));
        process.exit(1);
    }
}


module.exports = Logger;