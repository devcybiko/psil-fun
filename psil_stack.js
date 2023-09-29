const Logger = require("./psil_logger.js");

class Stack {
    constructor(logger) {
        this.log = logger || new Logger();
        this.stack = [];
    }
    push(item) {
        this.log.trace("push", item);
        this.stack.push(item);
    }

    bpush(item) {
        this.push(item ? 1 : 0);
    }

    pop() {
        let item = this.stack.pop();
        if (item === undefined) log.die("ERROR: Stack underflow");
        this.log.debug("pop", item);
        return item;
    }
    npop() {
        let n = this.pop();
        if (typeof (n) !== "number") {
            this.push(n);
            this.log.die("ERROR: Can't pop non-number", n, typeof (n));
        }
        return n;
    }
    lpop() {
        let n = this.pop();
        if (typeof (n) !== "object") {
            this.push(n);
            this.log.die("ERROR: Can't pop non-list", n);
        }
        return n;
    }
    spop() {
        let n = this.pop();
        if (typeof (n) !== "string") {
            this.pusn(n);
            this.log.die("ERROR: Can't pop non-string / non-symbol", n);
        }
        return n;
    }

    peek(i = this.stack.length - 1) {
        return this.stack[i];
    }
}
module.exports = Stack;
