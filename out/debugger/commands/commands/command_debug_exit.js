"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandDebugExit = void 0;
const command_1 = require("../command");
const mediator_1 = require("../../mediator");
class CommandDebugExit extends command_1.Command {
    trigger(parameters) {
        mediator_1.Mediator.notify("debug_exit");
    }
}
exports.CommandDebugExit = CommandDebugExit;
//# sourceMappingURL=command_debug_exit.js.map