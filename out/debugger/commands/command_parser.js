"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandParser = void 0;
const command_debug_enter_1 = require("./commands/command_debug_enter");
const command_output_1 = require("./commands/command_output");
const command_stack_dump_1 = require("./commands/command_stack_dump");
const command_stack_frame_vars_1 = require("./commands/command_stack_frame_vars");
const command_null_1 = require("./commands/command_null");
const command_message_scene_tree_1 = require("./commands/command_message_scene_tree");
const command_message_inspect_object_1 = require("./commands/command_message_inspect_object");
const command_debug_exit_1 = require("./commands/command_debug_exit");
const variant_encoder_1 = require("../variables/variant_encoder");
class CommandParser {
    constructor() {
        this.commands = new Map([
            [
                "output",
                function () {
                    return new command_output_1.CommandOutput();
                },
            ],
            [
                "message:scene_tree",
                function () {
                    return new command_message_scene_tree_1.CommandMessageSceneTree();
                },
            ],
            [
                "message:inspect_object",
                function () {
                    return new command_message_inspect_object_1.CommandMessageInspectObject();
                },
            ],
            [
                "stack_dump",
                function () {
                    return new command_stack_dump_1.CommandStackDump();
                },
            ],
            [
                "stack_frame_vars",
                function () {
                    return new command_stack_frame_vars_1.CommandStackFrameVars();
                },
            ],
            [
                "debug_enter",
                function () {
                    return new command_debug_enter_1.CommandDebugEnter();
                },
            ],
            [
                "debug_exit",
                function () {
                    return new command_debug_exit_1.CommandDebugExit();
                },
            ],
        ]);
        this.encoder = new variant_encoder_1.VariantEncoder();
        this.parameters = [];
    }
    has_command() {
        return this.current_command;
    }
    make_break_command() {
        return this.build_buffered_command("break");
    }
    make_continue_command() {
        return this.build_buffered_command("continue");
    }
    make_inspect_object_command(object_id) {
        return this.build_buffered_command("inspect_object", [object_id]);
    }
    make_next_command() {
        return this.build_buffered_command("next");
    }
    make_remove_breakpoint_command(path_to, line) {
        return this.build_buffered_command("breakpoint", [path_to, line, false]);
    }
    make_request_scene_tree_command() {
        return this.build_buffered_command("request_scene_tree");
    }
    make_send_breakpoint_command(path_to, line) {
        return this.build_buffered_command("breakpoint", [path_to, line, true]);
    }
    make_set_object_value_command(object_id, label, new_parsed_value) {
        return this.build_buffered_command("set_object_property", [
            object_id,
            label,
            new_parsed_value,
        ]);
    }
    make_stack_dump_command() {
        return this.build_buffered_command("get_stack_dump");
    }
    make_stack_frame_vars_command(frame_id) {
        return this.build_buffered_command("get_stack_frame_vars", [frame_id]);
    }
    make_step_command() {
        return this.build_buffered_command("step");
    }
    parse_message(dataset) {
        while (dataset && dataset.length > 0) {
            if (this.current_command) {
                this.parameters.push(dataset.shift());
                if (this.current_command.param_count !== -1) {
                    if (this.current_command.param_count === this.parameters.length) {
                        try {
                            this.current_command.trigger(this.parameters);
                        }
                        catch (e) {
                            // FIXME: Catch exception during trigger command: TypeError: class_name.replace is not a function
                            // class_name is the key of Mediator.inspect_callbacks
                            console.error("Catch exception during trigger command: " + e);
                        }
                        finally {
                            this.current_command = undefined;
                            this.parameters = [];
                        }
                    }
                    else if (this.current_command.param_count < this.parameters.length) {
                        // we debugged that an exception occures during this.current_command.trigger(this.parameters)
                        // because we do not understand the root cause of the exception, we set the current command to undefined
                        // to avoid a infinite loop of parse_message(...)
                        this.current_command = undefined;
                        this.parameters = [];
                        console.log("Exception not catched. Reset current_command to avoid infinite loop.");
                    }
                }
                else {
                    this.current_command.param_count = this.parameters.shift();
                    if (this.current_command.param_count === 0) {
                        this.current_command.trigger([]);
                        this.current_command = undefined;
                    }
                }
            }
            else {
                let data = dataset.shift();
                if (data && this.commands.has(data)) {
                    this.current_command = this.commands.get(data)();
                }
                else {
                    this.current_command = new command_null_1.CommandNull();
                }
            }
        }
    }
    build_buffered_command(command, parameters) {
        let command_array = [command];
        if (parameters) {
            parameters.forEach((param) => {
                command_array.push(param);
            });
        }
        let buffer = this.encoder.encode_variant(command_array);
        return buffer;
    }
}
exports.CommandParser = CommandParser;
//# sourceMappingURL=command_parser.js.map