#!/usr/bin/env node

/** 
 * template for a main.js file
 **/

const glstools = require('glstools');
const gprocs = glstools.procs;
const gstrings = glstools.strings;
const gfiles = glstools.files;
const fs = require("fs");
const path = require("path");

let DEBUG = false;
let INFO = false;
let TRACE = true;

function info() {
    if (INFO) console.log("info", ...arguments);
}
function debug() {
    if (DEBUG) console.log("debug:", ...arguments);
}

function trace() {
    if (TRACE) console.log("trace:", ...arguments);
}

function print() {
    console.log(...arguments);
}
function die() {
    console.error(...arguments);
    print({ stack, symbols })
    process.exit(1);
}

function equals(a,b) {
    if (typeof(a) !== typeof(b)) return false;
    if (typeof(a) === "object") {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!equals(a[i], b[i])) return false;
        }
        return true;
    }
    return a === b;
}

const NON_TERMINALS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_.";
const SPACES = " \t\n\r";
const STRING_DELIMITER = "`";
const OPERATIONS = {
    "$": eval,
    "$$": () => { eval(); eval() },
    "=": assign,
    "+": add,
    "-": subtract,
    "*": multiply,
    "/": divide,
    "//": intdiv,
    "%": mod,
    "++": incr,
    "--": decr,
    ">": () => { let a = pop(); let b = pop(); bpush(b > a) },
    "<": () => { let a = pop(); let b = pop(); bpush(b < a) },
    ">=": () => { let a = pop(); let b = pop(); bpush(b >= a) },
    "<=": () => { let a = pop(); let b = pop(); bpush(b <= a) },
    "==": () => { let a = pop(); let b = pop(); bpush(equals(a, b)) },
    "!=": () => { let a = pop(); let b = pop(); bpush(b !== a) },
    "&&": () => { let a = npop(); let b = npop(); bpush(b && a) },
    "||": () => { let a = npop(); let b = npop(); bpush(b || a) },
    "!": () => { let a = npop(); bpush(!a) },
    "str": () => { let a = npop(); push(a.toString()) },
    "?:": () => { let a = npop(); let b = npop(); let c = npop(); push(a ? b : c) },
    "if": () => { let a = npop(); let b = lpop(); a ? eval_list(b) : {} },
    "ifelse": () => { let a = npop(); let b = lpop(); let c = lpop(); a ? eval_list(b) : eval_list(c) },
    "peek": () => { let a = peek(); print(a) },
    "print": () => { let a = pop(); print(a) },
    "exit": () => { process.exit(0); },
    "die": () => { die(""); },
    "each": () => { let fn = lpop(); let items = lpop(); for (let item of items) { push(item); eval_list(fn) } },
    "while": () => { let a = lpop(); while (true) { eval_list(a); b = npop(); if (!b) break; } },
    "int": int,
    "reduce": reduce,
    "map": map,
    "...": spread,
    "car": car,
    "cdr": cdr,
    "swap": swap,
    "head": head,
    "tail": tail,
    "get": get,
    "nlist": nlist,
    "pop": pop,
    "?": lookup,
    "assert": () => { let a = npop(); if (!a) die("Assertion failed"); else trace("Assertion passed") },
};

let stack = [];
let symbols = {};
let levels = 0;

function push(item) {
    debug("push", item);
    stack.push(item);
}

function bpush(item) {
    push(item ? 1 : 0);
}

function pop() {
    let item = stack.pop();
    if (item === undefined) die("ERROR: Stack underflow");
    info("pop", item);
    return item;
}
function npop() {
    let n = pop();
    if (typeof (n) !== "number") {
        push(n);
        die("ERROR: Can't pop non-number", n, typeof (n));
    }
    return n;
}
function lpop() {
    let n = pop();
    if (typeof (n) !== "object") {
        push(n);
        die("ERROR: Can't pop non-list", n);
    }
    return n;
}
function spop() {
    let n = pop();
    if (typeof (n) !== "string") {
        pusn(n);
        die("ERROR: Can't pop non-string / non-symbol", n);
    }
    return n;
}
function sget(symbol) {
    let value = symbols[symbol];
    if (value === undefined) die(`ERROR: Undefined symbol '${symbol}'`);
    return value;
}

function peek(i = stack.length - 1) {
    return stack[i];
}

function parseToken(code, _i) {
    info("parseToken", code[_i], _i);
    if ("0123456789".includes(code[_i])) return parseNumber(code, _i);
    if (NON_TERMINALS.includes(code[_i])) return parseSymbol(code, _i);
    else return parseOperator(code, _i);
}

function parseSymbol(code, _i) {
    let token = "";
    let i = _i;
    for (; i < code.length; i++) {
        let c = code[i];
        if (!NON_TERMINALS.includes(c)) break;
        else token += c;
    }
    info("Symbol", token)
    push(token);
    return i;
}

function parseNumber(code, _i) {
    let token = "";
    let i = _i;
    for (; i < code.length; i++) {
        let c = code[i];
        if (!NON_TERMINALS.includes(c)) break;
        else token += c;
    }
    info("Number", token)
    if (token.match(/^[0-9.]+$/)) token = Number(token);
    push(token);
    return i;
}

function parseOperator(code, _i) {
    let token = "";
    let i = _i;
    for (; i < code.length; i++) {
        let c = code[i];
        if (c === STRING_DELIMITER || SPACES.includes(c) || NON_TERMINALS.includes(c)) break;
        else token += c;
    }
    info("Operator", "'" + token + "'");
    if (token === "(") defer();
    else if (token === ")") undefer();
    else push(token);
    return i;
}

function parseString(code, _i) {
    info("parseString", code[_i], _i);
    let token = "";
    let i = _i + 1;
    for (; i < code.length; i++) {
        let c = code[i];
        if (c !== STRING_DELIMITER) token += c;
        else break;
    }
    info("pushing", token)
    push(token);
    return i + 1;
}

function parse(code, _i = 0) {
    for (let i = _i; i < code.length;) {
        let c = code[i];
        if (SPACES.includes(c)) i++;
        else if (c === STRING_DELIMITER) i = parseString(code, i);
        else i = parseToken(code, i);
    }
}

function main(_opts) {
    let opts = _opts || gprocs.args("--trace,--verbose", "infile*");
    if (opts.trace) TRACE = true;
    let code = gfiles.read(opts.infile);
    parse(code);
    let pcode = stack;
    stack = [];
    print(".... RUNNING ...")
    eval_list(pcode)
    if (opts.verbose) {
        print(stack);
        print(symbols);
        print(".... DONE ..." + "\n");
    }
}

module.exports = { main }

function add() {
    let a = npop();
    let b = npop();
    debug(a, b, "+");
    push(a + b);
}

function subtract() {
    let a = npop();
    let b = npop();
    debug(a, b, "-");
    push(b - a);
}

function multiply() {
    let a = npop();
    let b = npop();
    debug(a, b, "*");
    push(a * b);
}

function divide() {
    let a = npop();
    let b = npop();
    debug(a, b, "/");
    push(b / a);
}

function mod() {
    let a = npop();
    let b = npop();
    debug(a, b, "%");
    push(b % a);
}

function int() {
    let a = npop();
    debug(a, "int");
    push(Math.floor(a));
}

function intdiv() {
    let a = npop();
    let b = npop();
    debug(a, b, "//");
    push(Math.floor(b / a));
}

function eval_list(list) {
    debug("eval", list);
    for (let i = 0; i < list.length; i++) {
        let item = list[i];
        if (typeof (item) === "string") {
            let op = OPERATIONS[item];
            if (op) op();
            else push(item);
        } else {
            push(item);
        }
    }
}

function eval() {
    let symbol = pop();
    debug(symbol, "$");
    if (typeof (symbol) === "number") return push(symbol);
    if (typeof (symbol) === "object") return eval_list(symbol);
    if (typeof (symbol) !== "string") die("ERROR: Can't eval non-string", symbol)
    let value = sget(symbol);
    push(value);
}

function assign() {
    let symbol = pop();
    let value = pop();
    symbols[symbol] = value;
    debug(value, symbol, "=");
}

function defer() {
    levels++;
    push("(");
    debug("( - defer");
}

function undefer() {
    levels--;
    if (levels < 0) die("Unbalanced parenthesis");

    let list = [];
    for (let item = pop(); item !== undefined && item !== "("; item = pop()) {
        debug("undefer", item);
        list.push(item);
    }
    list.reverse();
    push(list);
    debug(") - undefer");
}

function reduce() {
    let func = pop();
    let list = pop();
    debug("reduce", { func, list });
    for (let i = 0; i < list.length; i++) {
        let item = list[i];
        push(item);
        eval_list(func);
    }
}

function map() {
    let func = pop();
    let list = pop();
    debug("map", { func, list });
    let result = [];
    for (let item of list) {
        push(item);
        eval_list(func);
        result.push(pop());
    }
    push(result);
}

function car() {
    let list = pop();
    push(list[0]);
}

function cdr() {
    let list = pop();
    push(list.slice(1));
}

function head() {
    let n = npop();
    let list = pop();
    push(list.slice(0, n));
}

function tail() {
    let n = npop();
    let list = pop();
    push(list.slice(-n));
}

function get() {
    let n = npop();
    let list = pop();
    push(list[n]);
}

function incr() {
    let a = spop();
    let value = sget(a);
    symbols[a] = value + 1;
}

function decr() {
    let a = spop();
    let value = sget(a);
    symbols[a] = value - 1;
}

function swap() {
    let a = pop();
    let b = pop();
    push(a);
    push(b);
}

function spread() {
    let list = lpop();
    for (let item of list) push(item);
}

function nlist() {
    let n = npop();
    let list = [];
    for (let i = 0; i < n; i++) list.push(pop());
    list.reverse();
    push(list);
}

function lookup() {
    let n = pop();
    let list = lpop();
    if (typeof(n) === "number") {
        let value = list[n];
        push(value);
        return;
    }
    if (typeof(n) === "string") {
        let value = list.find(item => typeof(item) === "object" && item[0] === n);
        push(value);
        return;
    }
}
if (module.id === ".") {
    return main();
}
