"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandStackDump = void 0;
const command_1 = require("../command");
const mediator_1 = require("../../mediator");
class CommandStackDump extends command_1.Command {
    trigger(parameters) {
        let frames = parameters.map((sf, i) => {
            return {
                id: i,
                file: sf.get("file"),
                function: sf.get("function"),
                line: sf.get("line"),
            };
        });
        mediator_1.Mediator.notify("stack_dump", frames);
    }
}
exports.CommandStackDump = CommandStackDump;
//# sourceMappingURL=command_stack_dump.js.map