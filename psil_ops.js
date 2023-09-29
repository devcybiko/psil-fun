const Stack = require("./psil_stack.js");
const Logger = require("./psil_logger.js");
const glstools = require("glstools");
const gfiles = glstools.files;
const { psilify } = require("./psil_util.js");
const Parser = require("./psil_parse.js");

class Operators {
    constructor(logger) {
        this.log = logger || new Logger();
        this.symbols = {};
        this.stack = new Stack(this.log);
        this.log.stack = this.stack;
        this.log.symbols = this.symbols;

        this.OPERATIONS = {
            "$": this.eval.bind(this),
            "$$": () => { this.eval(); this.eval() },
            "<-": this.assign.bind(this),
            "+": this.add.bind(this),
            "-": this.subtract.bind(this),
            "*": this.multiply.bind(this),
            "/": this.divide.bind(this),
            "//": this.intdiv.bind(this),
            "%": this.mod.bind(this),
            "++": this.incr.bind(this),
            "--": this.decr.bind(this),
            ">": () => { let a = this.stack.pop(); let b = this.stack.pop(); this.stack.bpush(b > a) },
            "<": () => { let a = this.stack.pop(); let b = this.stack.pop(); this.stack.bpush(b < a) },
            ">=": () => { let a = this.stack.pop(); let b = this.stack.pop(); this.stack.bpush(b >= a) },
            "<=": () => { let a = this.stack.pop(); let b = this.stack.pop(); this.stack.bpush(b <= a) },
            "==": () => { let a = this.stack.pop(); let b = this.stack.pop(); this.stack.bpush(this.equals(a, b)) },
            "!=": () => { let a = this.stack.pop(); let b = this.stack.pop(); this.stack.bpush(b !== a) },
            "&&": () => { let a = this.stack.npop(); let b = this.stack.npop(); this.stack.bpush(b && a) },
            "||": () => { let a = this.stack.npop(); let b = this.stack.npop(); this.stack.bpush(b || a) },
            "!": () => { let a = this.stack.npop(); this.stack.bpush(!a) },
            "@": this.lookup.bind(this),
            "@@": () => { this.log.line = this.stack.npop(); this.log.trace("line", this.log.line) },
            "?:": () => { let a = this.stack.npop(); let b = this.stack.npop(); let c = this.stack.npop(); this.stack.push(a ? b : c) },
            "!!": () => { let a = this.stack.npop(); if (!a) this.log.die("Assertion failed"); else this.log.trace("Assertion passed") },
            ".": () => { let a = this.stack.peek(); this.stack.push(a) },

            ".spread": this.spread.bind(this),
            ".peek": () => { let a = this.stack.peek(); this.log.print(a) },
            ".str": () => { let a = this.stack.npop(); this.stack.push(a.toString()) },
            ".if": () => { let a = this.stack.npop(); let b = this.stack.lpop(); a ? eval_list(b) : {} },
            ".ifelse": () => { let a = this.stack.npop(); let b = this.stack.lpop(); let c = this.stack.lpop(); a ? eval_list(b) : eval_list(c) },
            ".print": () => { let a = this.stack.pop(); this.log.print(a) },
            ".exit": () => { process.exit(0); },
            ".die": () => { this.log.die(""); },
            ".each": () => { let fn = this.stack.lpop(); let items = this.stack.lpop(); for (let item of items) { this.stack.push(item); this.eval_list(fn) } },
            ".while": () => { let a = this.stack.lpop(); while (true) { this.eval_list(a); let b = this.stack.npop(); if (!b) break; } },
            ".int": this.int.bind(this),
            ".reduce": this.reduce.bind(this),
            ".map": this.map.bind(this),
            ".car": this.car.bind(this),
            ".cdr": this.cdr.bind(this),
            ".dup": () => { let a = this.stack.peek(); this.stack.push(a) },
            ".swap": this.swap.bind(this),
            ".head": this.head.bind(this),
            ".tail": this.tail.bind(this),
            ".get": this.get.bind(this),
            ".nlist": this.nlist.bind(this),
            ".pop": () => { this.stack.pop() },
            ".import": this.importFile.bind(this),
            ".export": this.exportFile.bind(this),
            ".read": this.readFile.bind(this),
            ".write": this.writeFile.bind(this),
        }
    }

    eval() {
        let symbol = this.stack.pop();
        this.log.debug(symbol, "$");
        if (typeof (symbol) === "number") return this.stack.push(symbol);
        if (typeof (symbol) === "object") return this.eval_list(symbol);
        if (typeof (symbol) === "string") return this.stack.push(this.sget(symbol));
        this.log.die("ERROR: Can't eval non-string", symbol)
    }

    eval_list(list) {
        this.log.debug("eval_list", list);
        for (let i = 0; i < list.length; i++) {
            let item = list[i];
            if (typeof (item) === "string") {
                this.do_op(item);
            } else {
                this.stack.push(item);
            }
        }
    }

    do_op(item) {
        let LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let letters = LETTERS.toLowerCase();
        let DIGITS = "0123456789";
        if (LETTERS.includes(item[0]) || letters.includes(item[0]) || item[0] === "_") {
            this.log.trace("symbol", item);
            this.stack.push(item);
            return;
        }
        if (DIGITS.includes(item[0]) || (item[0] === "-" && DIGITS.includes(item[1]))) {
            this.log.trace("number", item);
            this.stack.push(parseFloat(item));
            return;
        }
        let op = this.OPERATIONS[item];
        if (op) {
            this.log.trace("op", item);
            op();
        } else {
            this.log.die("ERROR: Unknown operation", item);
        }
    }

    add() {
        let a = this.stack.npop();
        let b = this.stack.npop();
        this.log.debug(a, b, "+");
        this.stack.push(a + b);
    }

    subtract() {
        let a = this.stack.npop();
        let b = this.stack.npop();
        this.log.debug(a, b, "-");
        this.stack.push(b - a);
    }

    multiply() {
        let a = this.stack.npop();
        let b = this.stack.npop();
        this.log.debug(a, b, "*");
        this.stack.push(a * b);
    }

    divide() {
        let a = this.stack.npop();
        let b = this.stack.npop();
        this.log.debug(a, b, "/");
        this.stack.push(b / a);
    }

    mod() {
        let a = this.stack.npop();
        let b = this.stack.npop();
        this.log.debug(a, b, "%");
        this.stack.push(b % a);
    }

    int() {
        let a = this.stack.npop();
        this.log.debug(a, "int");
        this.stack.push(Math.floor(a));
    }

    intdiv() {
        let a = this.stack.npop();
        let b = this.stack.npop();
        this.log.debug(a, b, "//");
        this.stack.push(Math.floor(b / a));
    }

    assign() {
        let symbol = this.stack.pop();
        let value = this.stack.pop();
        this.symbols[symbol] = value;
        this.log.debug(value, symbol, "=");
    }

    reduce() {
        let func = this.stack.pop();
        let list = this.stack.pop();
        this.log.debug("reduce", { func, list });
        for (let i = 0; i < list.length; i++) {
            let item = list[i];
            this.stack.push(item);
            this.eval_list(func);
        }
    }

    map() {
        let func = this.stack.pop();
        let list = this.stack.pop();
        this.log.debug("map", { func, list });
        let result = [];
        for (let item of list) {
            this.stack.push(item);
            this.eval_list(func);
            result.push(this.stack.pop());
        }
        this.stack.push(result);
    }

    car() {
        let list = this.stack.pop();
        this.stack.push(list[0]);
    }

    cdr() {
        let list = this.stack.pop();
        this.stack.push(list.slice(1));
    }

    head() {
        let n = this.stack.npop();
        let list = this.stack.pop();
        this.stack.push(list.slice(0, n));
    }

    tail() {
        let n = this.stack.npop();
        let list = this.stack.pop();
        this.stack.push(list.slice(-n));
    }

    get() {
        let n = this.stack.npop();
        let list = this.stack.pop();
        this.stack.push(list[n]);
    }

    incr() {
        let a = this.stack.spop();
        let value = this.sget(a);
        this.symbols[a] = value + 1;
    }

    decr() {
        let a = this.stack.spop();
        let value = this.sget(a);
        this.symbols[a] = value - 1;
    }

    swap() {
        let a = this.stack.pop();
        let b = this.stack.pop();
        this.stack.push(a);
        this.stack.push(b);
    }

    spread() {
        let list = this.stack.lpop();
        for (let item of list) this.stack.push(item);
    }

    nlist() {
        let n = this.stack.npop();
        let list = [];
        for (let i = 0; i < n; i++) list.push(this.stack.pop());
        list.reverse();
        this.stack.push(list);
    }

    lookup() {
        let n = this.stack.pop();
        let list = this.stack.pop();
        if (typeof (n) === "number") {
            let value = list[n];
            this.stack.push(value);
            return;
        }
        if (typeof (n) === "string") {
            let value = list.find(item => typeof (item) === "object" && item[0] === n);
            if (value === undefined) this.log.die("ERROR: element not found", n);
            this.stack.push(value[1]);
            return;
        }
        this.log.die("ERROR: Can't lookup non-number / non-string", n);
    }

    importFile() {
        let filename = this.stack.pop();
        let code = gfiles.read(filename);
        let parser = new Parser(this.log);
        let list = parser.parse(code);
        this.stack.push(list);
    }

    exportFile() {
        let filename = this.stack.pop();
        let code = this.stack.pop();
        gfiles.write(filename, psilify(code));
    }

    readFile() {
        let filename = this.stack.pop();
        let s = gfiles.read(filename);
        this.stack.push(s);
    }

    writeFile() {
        let filename = this.stack.pop();
        let s = this.stack.pop();
        gfiles.write(filename, s);
    }

    sget(symbol) {
        let value = this.symbols[symbol];
        if (value === undefined) die(`ERROR: Undefined symbol '${symbol}'`);
        return value;
    }
    equals(a, b) {
        if (typeof (a) !== typeof (b)) return false;
        if (typeof (a) === "object") {
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) {
                if (!this.equals(a[i], b[i])) return false;
            }
            return true;
        }
        return a === b;
    }
}

module.exports = Operators;