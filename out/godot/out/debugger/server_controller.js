"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerController = void 0;
const command_parser_1 = require("./commands/command_parser");
const mediator_1 = require("./mediator");
const variant_decoder_1 = require("./variables/variant_decoder");
const vscode_1 = require("vscode");
const TERMINATE = require("terminate");
const net = require("net");
const utils = require("../utils");
const cp = require("child_process");
const path = require("path");
class ServerController {
    constructor() {
        this.command_buffer = [];
        this.commands = new command_parser_1.CommandParser();
        this.decoder = new variant_decoder_1.VariantDecoder();
        this.draining = false;
        this.exception = "";
        this.stepping_out = false;
        this.terminated = false;
    }
    break() {
        this.add_and_send(this.commands.make_break_command());
    }
    continue() {
        this.add_and_send(this.commands.make_continue_command());
    }
    next() {
        this.add_and_send(this.commands.make_next_command());
    }
    remove_breakpoint(path_to, line) {
        this.debug_data.remove_breakpoint(path_to, line);
        this.add_and_send(this.commands.make_remove_breakpoint_command(path_to, line));
    }
    send_inspect_object_request(object_id) {
        this.add_and_send(this.commands.make_inspect_object_command(object_id));
    }
    send_request_scene_tree_command() {
        this.add_and_send(this.commands.make_request_scene_tree_command());
    }
    send_scope_request(frame_id) {
        this.add_and_send(this.commands.make_stack_frame_vars_command(frame_id));
    }
    set_breakpoint(path_to, line) {
        this.add_and_send(this.commands.make_send_breakpoint_command(path_to, line));
    }
    set_exception(exception) {
        this.exception = exception;
    }
    set_object_property(object_id, label, new_parsed_value) {
        this.add_and_send(this.commands.make_set_object_value_command(BigInt(object_id), label, new_parsed_value));
    }
    stack_dump() {
        this.add_and_send(this.commands.make_stack_dump_command());
    }
    start(project_path, address, port, launch_instance, launch_scene, scene_file, debug_data) {
        this.debug_data = debug_data;
        if (launch_instance) {
            let godot_path = utils.get_configuration("editor_path", "godot");
            const force_visible_collision_shapes = utils.get_configuration("force_visible_collision_shapes", false);
            const force_visible_nav_mesh = utils.get_configuration("force_visible_nav_mesh", false);
            let executable_line = `"${godot_path}" --path "${project_path}" --remote-debug ${address}:${port}`;
            if (force_visible_collision_shapes) {
                executable_line += " --debug-collisions";
            }
            if (force_visible_nav_mesh) {
                executable_line += " --debug-navigation";
            }
            if (launch_scene) {
                let filename = "";
                if (scene_file) {
                    filename = scene_file;
                }
                else {
                    filename = vscode_1.window.activeTextEditor.document.fileName;
                }
                executable_line += ` "${filename}"`;
            }
            executable_line += this.breakpoint_string(debug_data.get_all_breakpoints(), project_path);
            let godot_exec = cp.exec(executable_line, (error) => {
                if (!this.terminated) {
                    vscode_1.window.showErrorMessage(`Failed to launch Godot instance: ${error}`);
                }
            });
            this.godot_pid = godot_exec.pid;
        }
        this.server = net.createServer((socket) => {
            this.socket = socket;
            if (!launch_instance) {
                let breakpoints = this.debug_data.get_all_breakpoints();
                breakpoints.forEach((bp) => {
                    this.set_breakpoint(this.breakpoint_path(project_path, bp.file), bp.line);
                });
            }
            socket.on("data", (buffer) => {
                let buffers = this.split_buffers(buffer);
                while (buffers.length > 0) {
                    let sub_buffer = buffers.shift();
                    let data = this.decoder.get_dataset(sub_buffer, 0).slice(1);
                    this.commands.parse_message(data);
                }
            });
            socket.on("close", (had_error) => {
                mediator_1.Mediator.notify("stop");
            });
            socket.on("end", () => {
                mediator_1.Mediator.notify("stop");
            });
            socket.on("error", (error) => {
                mediator_1.Mediator.notify("error", [error]);
            });
            socket.on("drain", () => {
                socket.resume();
                this.draining = false;
                this.send_buffer();
            });
        });
        this.server.listen(port, address);
    }
    step() {
        this.add_and_send(this.commands.make_step_command());
    }
    step_out() {
        this.stepping_out = true;
        this.add_and_send(this.commands.make_next_command());
    }
    stop() {
        var _a, _b;
        (_a = this.socket) === null || _a === void 0 ? void 0 : _a.destroy();
        (_b = this.server) === null || _b === void 0 ? void 0 : _b.close((error) => {
            if (error) {
                console.log(error);
            }
            this.server.unref();
            this.server = undefined;
        });
        if (this.godot_pid) {
            this.terminate();
        }
    }
    terminate() {
        this.terminated = true;
        TERMINATE(this.godot_pid);
        this.godot_pid = undefined;
    }
    trigger_breakpoint(stack_frames) {
        let continue_stepping = false;
        let stack_count = stack_frames.length;
        let file = stack_frames[0].file.replace("res://", `${this.debug_data.project_path}/`);
        let line = stack_frames[0].line;
        if (this.stepping_out) {
            let breakpoint = this.debug_data
                .get_breakpoints(file)
                .find((bp) => bp.line === line);
            if (!breakpoint) {
                if (this.debug_data.stack_count > 1) {
                    continue_stepping = this.debug_data.stack_count === stack_count;
                }
                else {
                    let file_same = stack_frames[0].file === this.debug_data.last_frame.file;
                    let func_same = stack_frames[0].function === this.debug_data.last_frame.function;
                    let line_greater = stack_frames[0].line >= this.debug_data.last_frame.line;
                    continue_stepping = file_same && func_same && line_greater;
                }
            }
        }
        this.debug_data.stack_count = stack_count;
        this.debug_data.last_frame = stack_frames[0];
        if (continue_stepping) {
            this.next();
            return;
        }
        this.stepping_out = false;
        this.debug_data.stack_files = stack_frames.map((sf) => {
            return sf.file;
        });
        if (this.exception.length === 0) {
            mediator_1.Mediator.notify("stopped_on_breakpoint", [stack_frames]);
        }
        else {
            mediator_1.Mediator.notify("stopped_on_exception", [stack_frames, this.exception]);
        }
    }
    add_and_send(buffer) {
        this.command_buffer.push(buffer);
        this.send_buffer();
    }
    breakpoint_path(project_path, file) {
        let relative_path = path.relative(project_path, file).replace(/\\/g, "/");
        if (relative_path.length !== 0) {
            return `res://${relative_path}`;
        }
        return undefined;
    }
    breakpoint_string(breakpoints, project_path) {
        let output = "";
        if (breakpoints.length > 0) {
            output += " --breakpoints ";
            breakpoints.forEach((bp, i) => {
                output += `${this.breakpoint_path(project_path, bp.file)}:${bp.line}${i < breakpoints.length - 1 ? "," : ""}`;
            });
        }
        return output;
    }
    send_buffer() {
        if (!this.socket) {
            return;
        }
        while (!this.draining && this.command_buffer.length > 0) {
            this.draining = !this.socket.write(this.command_buffer.shift());
        }
    }
    split_buffers(buffer) {
        let len = buffer.byteLength;
        let offset = 0;
        let buffers = [];
        while (len > 0) {
            let sub_len = buffer.readUInt32LE(offset) + 4;
            buffers.push(buffer.slice(offset, offset + sub_len));
            offset += sub_len;
            len -= sub_len;
        }
        return buffers;
    }
}
exports.ServerController = ServerController;
//# sourceMappingURL=server_controller.js.map