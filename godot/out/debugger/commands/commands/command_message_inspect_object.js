"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandMessageInspectObject = void 0;
const command_1 = require("../command");
const variants_1 = require("../../variables/variants");
const mediator_1 = require("../../mediator");
class CommandMessageInspectObject extends command_1.Command {
    trigger(parameters) {
        let id = BigInt(parameters[0]);
        let class_name = parameters[1];
        let properties = parameters[2];
        let raw_object = new variants_1.RawObject(class_name);
        properties.forEach((prop) => {
            raw_object.set(prop[0], prop[5]);
        });
        mediator_1.Mediator.notify("inspected_object", [id, raw_object]);
    }
}
exports.CommandMessageInspectObject = CommandMessageInspectObject;
//# sourceMappingURL=command_message_inspect_object.js.map