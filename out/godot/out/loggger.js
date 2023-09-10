"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    constructor(tag, time) {
        this.buffer = "";
        this.tag = '';
        this.time = false;
        this.tag = tag;
        this.time = time;
    }
    clear() {
        this.buffer = "";
    }
    log(...messages) {
        let line = '';
        if (this.tag) {
            line += `[${this.tag}]`;
        }
        if (this.time) {
            line += `[${new Date().toISOString()}]`;
        }
        if (line) {
            line += ' ';
        }
        for (let index = 0; index < messages.length; index++) {
            line += messages[index];
            if (index < messages.length) {
                line += " ";
            }
            else {
                line += "\n";
            }
        }
        this.buffer += line;
        console.log(line);
    }
    get_buffer() {
        return this.buffer;
    }
}
exports.Logger = Logger;
const logger = new Logger('godot-tools', true);
exports.default = logger;
//# sourceMappingURL=loggger.js.map