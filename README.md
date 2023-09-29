# psil-fun
- a reverse-polish stack-based language loosely inspired by Lisp and Forth

## Files
- test.psil - example PSIL input file
- psil.js - main code
- psil_logger.js - logging 
- psil_ops.js - operators
- psil_parse.js - parser
- psil_stack.js - the stack class
- psil_util.js - utilities

## Data Types
- Number (any string that includes only digits and '.')
- String (any non-number, plus literal strings surrounded by backticks (\`) including whitespace and newlines
- List - a grouping of objects surrounded by parentheses
- Operator - any string that begins with non-alphanumeric characters
    - some operators are already specified

## Stack
- each element (number, string, list) is pushed onto the stack
- an operator may pull elements off the stack and perform operations on it
    - optionally pushing new elements onto the stack

## Symbol Table
- there is one global symbol table holding variable names
- use the assignment operator (<-) to assign values to symbols
- use the eval operator (\$) to retrieve the value of symbols

## Comments
- a pound-sign `#` starts a single-line comment
- all characters up to and including the newline are ignored
- there is no 'multiline' comment
- but you can use a multiline string and .pop it off the stack :/
## Functions
- Functions are just a list that is evaluated
- Such a list can be assigned to a symbol and evaluated with `$$`
```
(.dup *) square <-
5 square$$
```
- Here, `(.dup *)` is a list containing the operator for duplicating the head of the stack, and then a multiplication.
- `<-` then assigns the list to the symbol `square`
- Then, `5` is pushed onto the stack followed by the symbol `square`. 
- Finally the double-eval is called which first dereferences `square` - pushing `(.dup *)` onto the stack
    - and then it immediately evaluates `(.dup *)`
    - which duplicates `5` -> `( 5 5 )`
    - and invokes `*` which multiplies the two values -> `(25)`

## Operators
- "\$":  (a \$) -> (...) "eval" - pops the element and replaces it with the evaluation of the element
    - if string - "dereferences" the string by replacing it with the value in the symbol table
    - if list - executes each element in the list (pushing elements and evaluating operators)
- "\$\$": (a \$\$) -> (...) double eval - good for dereferencing a function and evaluating it
- "<-": ( b a <- ) assign 'b' to the symbol 'a'
    - note that we don't use the "=" operator
    - this is to prevent confusion with the "==" operator

- Binary Operators
    - "+": ( b a + ) -> (c) add b + a and push the result
    - "-": subtraction
    - "*": multiplication
    - "/": division
    - "//": integer division
    - "%": modulus
    - ">": greater than
    - "<": less than
    - ">=": greater than or equal
    - "<=": less than or equal
    - "==": equal to
    - "!=": not equal to
    - "&&": 'and'
    - "||": 'or' 

- Unary operators
    - "!": (a !) -> (!a) - 'not'
    - "++": (a ++) -> () - increment a symbol's value
    - "--": (a --) -> () - decrement a symbol's value

- List operators
    - "@": index or lookup
        - ((a A) (b B)) 'b' @) -> (B) - treat 'list' as a dictionary and return the element whose 'car' == 'a'
        - ((a b c) 1 @) -> (b) - treat 'list' as an array and return the 'nth' element (zero-based)
    - ".spread": ((a b c) .spread) -> (a b c) 
    - ".reduce": (x (a b c) fn .reduce) -> (result) - apply 'fn' to 'list' and accumulate the results
    - ".map": (a b c) fn -> (A B C) - apply 'fn' to each element of 'list and push resulting list
    - ".car": ((a b c) .car) -> (a)
    - ".cdr": ((a b c) .cdr) -> ((b c))
    - ".head": (2 (a b c) .head) -> (a b) - pulls the top 'n' elements from a list
    - ".tail": (2 (a b c) .tail) -> (b c) - pulls the last 'n' elements from a list
    - ".get": (((a A) (b B) (c C)) 'a' .get) -> (A) - treat list as dictionary and dereference
    - ".nlist": (a b c 2 .nlist) -> (a (b c)) - group 'n' things together as a list

- Stack Operators
    - ".": (a .) -> (a a) - duplicate the head of the stack
    - ".dup": () => alias for '.'
    - ".swap": (a b c .swap) -> (a c b) - swap the top elements of the stack
    - ".pop": (a b c .pop) -> (a b) - pop an element off the stack and dispose of it

- Conditional
    - "?:": (a b c ?:) - if 'c' is true, push 'a', else push 'b'
    - ".if": (a b .if) -> if 'b' is true, pushes the eval of a (a\$)
    - ".ifelse": (a b c .ifelse) -> if 'c' is true, push a\$ else push b\$

- Loop
    - ".each": ((a b c) fn .each) -> (A B C) - execute 'fn' against each of the elements of the list
    - ".while": (a .while) -> (...) - eval 'a' then iterate if the resultant value on the stack is true

- Other
    - "@@": internal use only - sets the source code line number
    - "!!": (a !!) -> () - assert - if 'a' is false, die()
    - ".str": (3.14159 .str) -> ("3.14159") - toString() operator
    - ".int": ("123" .int) -> (123) - int() operator
    - ".print": (a .print) -> () - print the head of the stack to stdout
    - ".peek": () => (a .peek) -> (a) - print the head of the stack but don't pop it
    - ".exit": exit the program without debug
    - ".die": exit the program and dump the symbol table and stack

- File I/O:
    - ".import": ('fname.psil' .import) -> (...) - read the fname, parse it, and evaluate it
    - ".export": (list 'fname.psil' .export) -> () - write the list to 'fname'
    - ".read": ('fname' .read) -> ("...") - reads the file as a string and pushes it to the stack
    - ".write": (string 'fname' .write) -> () - writes the 'string' to 'fname'

