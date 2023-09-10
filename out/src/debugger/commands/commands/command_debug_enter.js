"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandDebugEnter = void 0;
const command_1 = require("../command");
const mediator_1 = require("../../mediator");
class CommandDebugEnter extends command_1.Command {
    trigger(parameters) {
        let reason = parameters[1];
        mediator_1.Mediator.notify("debug_enter", [reason]);
    }
}
exports.CommandDebugEnter = CommandDebugEnter;
//# sourceMappingURL=command_debug_enter.js.map