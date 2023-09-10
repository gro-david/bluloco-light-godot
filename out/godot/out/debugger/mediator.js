"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mediator = void 0;
const vscode_1 = require("vscode");
const vscode_debugadapter_1 = require("vscode-debugadapter");
class Mediator {
    constructor() { }
    static notify(event, parameters = []) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4;
        switch (event) {
            case "output":
                if (!this.first_output) {
                    this.first_output = true;
                    this.output.show(true);
                    this.output.clear();
                    (_a = this.controller) === null || _a === void 0 ? void 0 : _a.send_request_scene_tree_command();
                }
                let lines = parameters;
                lines.forEach((line) => {
                    let message_content = line[0];
                    //let message_kind: number = line[1];
                    // OutputChannel doesn't give a way to distinguish between a 
                    // regular string (message_kind == 0) and an error string (message_kind == 1).
                    this.output.appendLine(message_content);
                });
                break;
            case "continue":
                (_b = this.controller) === null || _b === void 0 ? void 0 : _b.continue();
                break;
            case "next":
                (_c = this.controller) === null || _c === void 0 ? void 0 : _c.next();
                break;
            case "step":
                (_d = this.controller) === null || _d === void 0 ? void 0 : _d.step();
                break;
            case "step_out":
                (_e = this.controller) === null || _e === void 0 ? void 0 : _e.step_out();
                break;
            case "inspect_object":
                (_f = this.controller) === null || _f === void 0 ? void 0 : _f.send_inspect_object_request(parameters[0]);
                if (parameters[1]) {
                    this.inspect_callbacks.set(parameters[0], parameters[1]);
                }
                break;
            case "inspected_object":
                let inspected_variable = { name: "", value: parameters[1] };
                this.build_sub_values(inspected_variable);
                if (this.inspect_callbacks.has(Number(parameters[0]))) {
                    this.inspect_callbacks.get(Number(parameters[0]))(inspected_variable.name, inspected_variable);
                    this.inspect_callbacks.delete(Number(parameters[0]));
                }
                else {
                    (_g = this.session) === null || _g === void 0 ? void 0 : _g.set_inspection(parameters[0], inspected_variable);
                }
                break;
            case "stack_dump":
                (_h = this.controller) === null || _h === void 0 ? void 0 : _h.trigger_breakpoint(parameters);
                (_j = this.controller) === null || _j === void 0 ? void 0 : _j.send_request_scene_tree_command();
                break;
            case "request_scene_tree":
                (_k = this.controller) === null || _k === void 0 ? void 0 : _k.send_request_scene_tree_command();
                break;
            case "scene_tree":
                (_m = (_l = this.debug_data) === null || _l === void 0 ? void 0 : _l.scene_tree) === null || _m === void 0 ? void 0 : _m.fill_tree(parameters[0]);
                break;
            case "get_scopes":
                (_o = this.controller) === null || _o === void 0 ? void 0 : _o.send_scope_request(parameters[0]);
                break;
            case "stack_frame_vars":
                this.do_stack_frame_vars(parameters[0], parameters[1], parameters[2]);
                break;
            case "remove_breakpoint":
                (_p = this.controller) === null || _p === void 0 ? void 0 : _p.remove_breakpoint(parameters[0], parameters[1]);
                break;
            case "set_breakpoint":
                (_q = this.controller) === null || _q === void 0 ? void 0 : _q.set_breakpoint(parameters[0], parameters[1]);
                break;
            case "stopped_on_breakpoint":
                this.debug_data.last_frames = parameters[0];
                (_r = this.session) === null || _r === void 0 ? void 0 : _r.sendEvent(new vscode_debugadapter_1.StoppedEvent("breakpoint", 0));
                break;
            case "stopped_on_exception":
                this.debug_data.last_frames = parameters[0];
                (_s = this.session) === null || _s === void 0 ? void 0 : _s.set_exception(true);
                (_t = this.session) === null || _t === void 0 ? void 0 : _t.sendEvent(new vscode_debugadapter_1.StoppedEvent("exception", 0, parameters[1]));
                break;
            case "break":
                (_u = this.controller) === null || _u === void 0 ? void 0 : _u.break();
                break;
            case "changed_value":
                (_v = this.controller) === null || _v === void 0 ? void 0 : _v.set_object_property(parameters[0], parameters[1], parameters[2]);
                break;
            case "debug_enter":
                let reason = parameters[0];
                if (reason !== "Breakpoint") {
                    (_w = this.controller) === null || _w === void 0 ? void 0 : _w.set_exception(reason);
                }
                else {
                    (_x = this.controller) === null || _x === void 0 ? void 0 : _x.set_exception("");
                }
                (_y = this.controller) === null || _y === void 0 ? void 0 : _y.stack_dump();
                break;
            case "start":
                this.first_output = false;
                (_z = this.controller) === null || _z === void 0 ? void 0 : _z.start(parameters[0], parameters[1], parameters[2], parameters[3], parameters[4], parameters[5], this.debug_data);
                break;
            case "debug_exit":
                break;
            case "stop":
                (_0 = this.controller) === null || _0 === void 0 ? void 0 : _0.stop();
                (_1 = this.session) === null || _1 === void 0 ? void 0 : _1.sendEvent(new vscode_debugadapter_1.TerminatedEvent());
                break;
            case "error":
                (_2 = this.controller) === null || _2 === void 0 ? void 0 : _2.set_exception(parameters[0]);
                (_3 = this.controller) === null || _3 === void 0 ? void 0 : _3.stop();
                (_4 = this.session) === null || _4 === void 0 ? void 0 : _4.sendEvent(new vscode_debugadapter_1.TerminatedEvent());
                break;
        }
    }
    static set_controller(controller) {
        this.controller = controller;
    }
    static set_debug_data(debug_data) {
        this.debug_data = debug_data;
    }
    static set_session(debug_session) {
        this.session = debug_session;
    }
    static build_sub_values(va) {
        let value = va.value;
        let sub_values = undefined;
        if (value && Array.isArray(value)) {
            sub_values = value.map((va, i) => {
                return { name: `${i}`, value: va };
            });
        }
        else if (value instanceof Map) {
            sub_values = Array.from(value.keys()).map((va) => {
                if (typeof va["stringify_value"] === "function") {
                    return {
                        name: `${va.type_name()}${va.stringify_value()}`,
                        value: value.get(va),
                    };
                }
                else {
                    return {
                        name: `${va}`,
                        value: value.get(va),
                    };
                }
            });
        }
        else if (value && typeof value["sub_values"] === "function") {
            sub_values = value.sub_values().map((sva) => {
                return { name: sva.name, value: sva.value };
            });
        }
        va.sub_values = sub_values;
        sub_values === null || sub_values === void 0 ? void 0 : sub_values.forEach((sva) => this.build_sub_values(sva));
    }
    static do_stack_frame_vars(locals, members, globals) {
        var _a;
        let locals_out = [];
        let members_out = [];
        let globals_out = [];
        for (let i = 0; i < locals.length + members.length + globals.length; i += 2) {
            const name = i < locals.length
                ? locals[i]
                : i < members.length + locals.length
                    ? members[i - locals.length]
                    : globals[i - locals.length - members.length];
            const value = i < locals.length
                ? locals[i + 1]
                : i < members.length + locals.length
                    ? members[i - locals.length + 1]
                    : globals[i - locals.length - members.length + 1];
            let variable = {
                name: name,
                value: value,
            };
            this.build_sub_values(variable);
            i < locals.length
                ? locals_out.push(variable)
                : i < members.length + locals.length
                    ? members_out.push(variable)
                    : globals_out.push(variable);
        }
        (_a = this.session) === null || _a === void 0 ? void 0 : _a.set_scopes(locals_out, members_out, globals_out);
    }
}
exports.Mediator = Mediator;
Mediator.inspect_callbacks = new Map();
Mediator.first_output = false;
Mediator.output = vscode_1.window.createOutputChannel("Godot");
//# sourceMappingURL=mediator.js.map