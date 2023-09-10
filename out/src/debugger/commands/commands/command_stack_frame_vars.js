"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandStackFrameVars = void 0;
const command_1 = require("../command");
const mediator_1 = require("../../mediator");
class CommandStackFrameVars extends command_1.Command {
    trigger(parameters) {
        let globals = [];
        let locals = [];
        let members = [];
        let local_count = parameters[0] * 2;
        let member_count = parameters[1 + local_count] * 2;
        let global_count = parameters[2 + local_count + member_count] * 2;
        if (local_count > 0) {
            let offset = 1;
            locals = parameters.slice(offset, offset + local_count);
        }
        if (member_count > 0) {
            let offset = 2 + local_count;
            members = parameters.slice(offset, offset + member_count);
        }
        if (global_count > 0) {
            let offset = 3 + local_count + member_count;
            globals = parameters.slice(offset, offset + global_count);
        }
        mediator_1.Mediator.notify("stack_frame_vars", [locals, members, globals]);
    }
}
exports.CommandStackFrameVars = CommandStackFrameVars;
//# sourceMappingURL=command_stack_frame_vars.js.map