const Logger = require("./psil_logger.js");

const ALPHA_NUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_";
const DIGITS = "0123456789";
const DIGITS_DOT = DIGITS + ".";
const SPACES = " \t\r";
const NL = "\n";
const STRING_DELIMITER = "`";


class Parser {
    constructor(logger) {
        this.levels = 0;
        this.stack = [];
        this.log = logger || new Logger();
    }

    pop() {
        let item = this.stack.pop();
        if (item === undefined) this.log.die("ERROR: Stack underflow");
        this.log.debug("pop", item);
        return item;
    }

    push(item) {
        this.log.debug("push", item);
        this.stack.push(item);
    }

    parse(code, _i = 0) {
        this.stack = [];
        for (let i = _i; i < code.length;) {
            let c = code[i];
            if (SPACES.includes(c)) i++;
            else if (c === NL) i = this.parseNL(code, i);
            else if (c === STRING_DELIMITER) i = this.parseString(code, i);
            else if (c === "#") i = this.parseComment(code, i);
            else if (c === "(") i = this.startList(code, i);
            else if (c === ")") i = this.endList(code, i);
            else if (c == ".") i = this.parseDotOperator(code, i);
            else if (c === "-" && DIGITS.includes(code[i + 1])) i = this.parseNumber(code, i);
            else if (DIGITS.includes(c)) i = this.parseNumber(code, i);
            else if (ALPHA_NUM.includes(c)) i = this.parseSymbol(code, i);
            else i = this.parseOperator(code, i);
        }
        return this.stack;
    }

    parseNL(code, i) {
        this.log.info("parseNL", code[i], i);
        this.log.line++;
        this.push(this.log.line);
        this.push("@@");
        return i + 1;
    }

    startList(code, i) {
        this.levels++;
        this.push("(");
        this.log.debug("( - startList");
        return i + 1
    }

    endList(code, i) {
        this.levels--;
        if (this.levels < 0) this.log.die("Unbalanced parenthesis");

        let list = [];
        for (let item = this.pop(); item !== undefined && item !== "("; item = this.pop()) {
            this.log.debug("endList", item);
            list.push(item);
        }
        list.reverse();
        this.push(list);
        this.log.debug(") - undefer");
        return i + 1
    }

    parseSymbol(code, _i) {
        let token = "";
        let i = _i;
        for (; i < code.length; i++) {
            let c = code[i];
            if (!ALPHA_NUM.includes(c)) break;
            else token += c;
        }
        this.log.trace("Symbol", token)
        this.push(token);
        return i;
    }

    parseNumber(code, _i) {
        let token = "";
        let i = _i;
        let c = code[i++];
        token += c;
        for (; i < code.length; i++) {
            c = code[i];
            if (!DIGITS_DOT.includes(c)) break;
            else token += c;
        }
        this.log.trace("Number", token)
        if (token.match(/^[0-9.]+$/)) token = Number(token);
        this.push(token);
        return i;
    }

    parseOperator(code, _i) {
        let token = "";
        let i = _i;
        for (; i < code.length; i++) {
            let c = code[i];
            if (c === STRING_DELIMITER || SPACES.includes(c) || ALPHA_NUM.includes(c) || NL.includes(c)) break;
            else token += c;
        }
        this.log.trace("Operator", "'" + token + "'");
        this.push(token);
        return i;
    }

    parseDotOperator(code, _i) {
        let i = _i;
        let token = code[i++];
        for (; i < code.length; i++) {
            let c = code[i];
            if (ALPHA_NUM.includes(c)) token += c;
            else break;
        }
        this.log.trace("Operator", "'" + token + "'");
        this.push(token);
        return i;
    }

    parseString(code, _i) {
        this.log.info("parseString", code[_i], _i);
        let token = "";
        let i = _i + 1;
        for (; i < code.length; i++) {
            let c = code[i];
            if (c !== STRING_DELIMITER) token += c;
            else break;
        }
        this.log.info("pushing", token)
        this.push(token);
        return i + 1;
    }
    parseComment(code, _i) {
        this.log.info("parseComment", code[_i], _i);
        let i = _i + 1;
        for (; i < code.length; i++) {
            let c = code[i];
            if (c === "\n") break
        }
        return i;
    }
    
}


module.exports = Parser;