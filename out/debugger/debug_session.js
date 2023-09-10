"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try {
            step(generator.next(value));
        }
        catch (e) {
            reject(e);
        } }
        function rejected(value) { try {
            step(generator["throw"](value));
        }
        catch (e) {
            reject(e);
        } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GodotDebugSession = void 0;
const vscode_debugadapter_1 = require("vscode-debugadapter");
const mediator_1 = require("./mediator");
const debug_runtime_1 = require("./debug_runtime");
const variants_1 = require("./variables/variants");
const server_controller_1 = require("./server_controller");
const { Subject } = require("await-notify");
const fs = require("fs");
const utils_1 = require("../utils");
class GodotDebugSession extends vscode_debugadapter_1.LoggingDebugSession {
    constructor() {
        super();
        this.debug_data = new debug_runtime_1.GodotDebugData();
        this.exception = false;
        this.got_scope = new Subject();
        this.ongoing_inspections = [];
        this.previous_inspections = [];
        this.configuration_done = new Subject();
        this.setDebuggerLinesStartAt1(false);
        this.setDebuggerColumnsStartAt1(false);
        mediator_1.Mediator.set_session(this);
        this.controller = new server_controller_1.ServerController();
        mediator_1.Mediator.set_controller(this.controller);
        mediator_1.Mediator.set_debug_data(this.debug_data);
    }
    dispose() { }
    set_exception(exception) {
        this.exception = true;
    }
    set_inspection(id, replacement) {
        let variables = this.all_scopes.filter((va) => va && va.value instanceof variants_1.ObjectId && va.value.id === id);
        variables.forEach((va) => {
            let index = this.all_scopes.findIndex((va_id) => va_id === va);
            let old = this.all_scopes.splice(index, 1);
            replacement.name = old[0].name;
            replacement.scope_path = old[0].scope_path;
            this.append_variable(replacement, index);
        });
        this.ongoing_inspections.splice(this.ongoing_inspections.findIndex((va_id) => va_id === id), 1);
        this.previous_inspections.push(id);
        this.add_to_inspections();
        if (this.ongoing_inspections.length === 0) {
            this.previous_inspections = [];
            this.got_scope.notify();
        }
    }
    set_scene_tree(scene_tree_provider) {
        this.debug_data.scene_tree = scene_tree_provider;
    }
    configurationDoneRequest(response, args) {
        this.configuration_done.notify();
        this.sendResponse(response);
    }
    set_scopes(locals, members, globals) {
        this.all_scopes = [
            undefined,
            { name: "local", value: undefined, sub_values: locals, scope_path: "@" },
            {
                name: "member",
                value: undefined,
                sub_values: members,
                scope_path: "@",
            },
            {
                name: "global",
                value: undefined,
                sub_values: globals,
                scope_path: "@",
            },
        ];
        locals.forEach((va) => {
            va.scope_path = `@.local`;
            this.append_variable(va);
        });
        members.forEach((va) => {
            va.scope_path = `@.member`;
            this.append_variable(va);
        });
        globals.forEach((va) => {
            va.scope_path = `@.global`;
            this.append_variable(va);
        });
        this.add_to_inspections();
        if (this.ongoing_inspections.length === 0) {
            this.previous_inspections = [];
            this.got_scope.notify();
        }
    }
    continueRequest(response, args) {
        if (!this.exception) {
            response.body = { allThreadsContinued: true };
            mediator_1.Mediator.notify("continue");
            this.sendResponse(response);
        }
    }
    evaluateRequest(response, args) {
        if (this.all_scopes) {
            let expression = args.expression;
            let matches = expression.match(/^[_a-zA-Z0-9]+?$/);
            if (matches) {
                let result_idx = this.all_scopes.findIndex((va) => va && va.name === expression);
                if (result_idx !== -1) {
                    let result = this.all_scopes[result_idx];
                    response.body = {
                        result: this.parse_variable(result).value,
                        variablesReference: result_idx,
                    };
                }
            }
        }
        if (!response.body) {
            response.body = {
                result: "null",
                variablesReference: 0,
            };
        }
        this.sendResponse(response);
    }
    initializeRequest(response, args) {
        response.body = response.body || {};
        response.body.supportsConfigurationDoneRequest = true;
        response.body.supportsTerminateRequest = true;
        response.body.supportsEvaluateForHovers = false;
        response.body.supportsStepBack = false;
        response.body.supportsGotoTargetsRequest = false;
        response.body.supportsCancelRequest = false;
        response.body.supportsCompletionsRequest = false;
        response.body.supportsFunctionBreakpoints = false;
        response.body.supportsDataBreakpoints = false;
        response.body.supportsBreakpointLocationsRequest = false;
        response.body.supportsConditionalBreakpoints = false;
        response.body.supportsHitConditionalBreakpoints = false;
        response.body.supportsLogPoints = false;
        response.body.supportsModulesRequest = false;
        response.body.supportsReadMemoryRequest = false;
        response.body.supportsRestartFrame = false;
        response.body.supportsRestartRequest = false;
        response.body.supportsSetExpression = false;
        response.body.supportsStepInTargetsRequest = false;
        response.body.supportsTerminateThreadsRequest = false;
        this.sendResponse(response);
        this.sendEvent(new vscode_debugadapter_1.InitializedEvent());
    }
    launchRequest(response, args) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.configuration_done.wait(1000);
            this.debug_data.project_path = args.project;
            this.exception = false;
            mediator_1.Mediator.notify("start", [
                args.project,
                args.address,
                args.port,
                args.launch_game_instance,
                args.launch_scene,
                utils_1.get_configuration("scene_file_config", "") || args.scene_file,
            ]);
            this.sendResponse(response);
        });
    }
    nextRequest(response, args) {
        if (!this.exception) {
            mediator_1.Mediator.notify("next");
            this.sendResponse(response);
        }
    }
    pauseRequest(response, args) {
        if (!this.exception) {
            mediator_1.Mediator.notify("break");
            this.sendResponse(response);
        }
    }
    scopesRequest(response, args) {
        return __awaiter(this, void 0, void 0, function* () {
            while (this.ongoing_inspections.length > 0) {
                yield this.got_scope.wait(100);
            }
            mediator_1.Mediator.notify("get_scopes", [args.frameId]);
            yield this.got_scope.wait(2000);
            response.body = {
                scopes: [
                    { name: "Locals", variablesReference: 1, expensive: false },
                    { name: "Members", variablesReference: 2, expensive: false },
                    { name: "Globals", variablesReference: 3, expensive: false },
                ],
            };
            this.sendResponse(response);
        });
    }
    setBreakPointsRequest(response, args) {
        let path = args.source.path.replace(/\\/g, "/");
        let client_lines = args.lines || [];
        if (fs.existsSync(path)) {
            let bps = this.debug_data.get_breakpoints(path);
            let bp_lines = bps.map((bp) => bp.line);
            bps.forEach((bp) => {
                if (client_lines.indexOf(bp.line) === -1) {
                    this.debug_data.remove_breakpoint(path, bp.line);
                }
            });
            client_lines.forEach((l) => {
                if (bp_lines.indexOf(l) === -1) {
                    let bp = args.breakpoints.find((bp_at_line) => (bp_at_line.line == l));
                    if (!bp.condition) {
                        this.debug_data.set_breakpoint(path, l);
                    }
                }
            });
            bps = this.debug_data.get_breakpoints(path);
            // Sort to ensure breakpoints aren't out-of-order, which would confuse VS Code.
            bps.sort((a, b) => (a.line < b.line ? -1 : 1));
            response.body = {
                breakpoints: bps.map((bp) => {
                    return new vscode_debugadapter_1.Breakpoint(true, bp.line, 1, new vscode_debugadapter_1.Source(bp.file.split("/").reverse()[0], bp.file));
                }),
            };
            this.sendResponse(response);
        }
    }
    stackTraceRequest(response, args) {
        if (this.debug_data.last_frame) {
            response.body = {
                totalFrames: this.debug_data.last_frames.length,
                stackFrames: this.debug_data.last_frames.map((sf) => {
                    return {
                        id: sf.id,
                        name: sf.function,
                        line: sf.line,
                        column: 1,
                        source: new vscode_debugadapter_1.Source(sf.file, `${this.debug_data.project_path}/${sf.file.replace("res://", "")}`),
                    };
                }),
            };
        }
        this.sendResponse(response);
    }
    stepInRequest(response, args) {
        if (!this.exception) {
            mediator_1.Mediator.notify("step");
            this.sendResponse(response);
        }
    }
    stepOutRequest(response, args) {
        if (!this.exception) {
            mediator_1.Mediator.notify("step_out");
            this.sendResponse(response);
        }
    }
    terminateRequest(response, args) {
        mediator_1.Mediator.notify("stop");
        this.sendResponse(response);
    }
    threadsRequest(response) {
        response.body = { threads: [new vscode_debugadapter_1.Thread(0, "thread_1")] };
        this.sendResponse(response);
    }
    variablesRequest(response, args) {
        return __awaiter(this, void 0, void 0, function* () {
            let reference = this.all_scopes[args.variablesReference];
            let variables;
            if (!reference.sub_values) {
                variables = [];
            }
            else {
                variables = reference.sub_values.map((va) => {
                    let sva = this.all_scopes.find((sva) => sva && sva.scope_path === va.scope_path && sva.name === va.name);
                    if (sva) {
                        return this.parse_variable(sva, this.all_scopes.findIndex((va_idx) => va_idx &&
                            va_idx.scope_path ===
                                `${reference.scope_path}.${reference.name}` &&
                            va_idx.name === va.name));
                    }
                });
            }
            response.body = {
                variables: variables,
            };
            this.sendResponse(response);
        });
    }
    add_to_inspections() {
        this.all_scopes.forEach((va) => {
            if (va && va.value instanceof variants_1.ObjectId) {
                if (!this.ongoing_inspections.find((va_id) => va_id === va.value.id) &&
                    !this.previous_inspections.find((va_id) => va_id === va.value.id)) {
                    mediator_1.Mediator.notify("inspect_object", [va.value.id]);
                    this.ongoing_inspections.push(va.value.id);
                }
            }
        });
    }
    append_variable(variable, index) {
        if (index) {
            this.all_scopes.splice(index, 0, variable);
        }
        else {
            this.all_scopes.push(variable);
        }
        let base_path = `${variable.scope_path}.${variable.name}`;
        if (variable.sub_values) {
            variable.sub_values.forEach((va, i) => {
                va.scope_path = `${base_path}`;
                this.append_variable(va, index ? index + i + 1 : undefined);
            });
        }
    }
    parse_variable(va, i) {
        let value = va.value;
        let rendered_value = "";
        let reference = 0;
        let array_size = 0;
        let array_type = undefined;
        if (typeof value === "number") {
            if (Number.isInteger(value)) {
                rendered_value = `${value}`;
            }
            else {
                rendered_value = `${parseFloat(value.toFixed(5))}`;
            }
        }
        else if (typeof value === "bigint" ||
            typeof value === "boolean" ||
            typeof value === "string") {
            rendered_value = `${value}`;
        }
        else if (typeof value === "undefined") {
            rendered_value = "null";
        }
        else {
            if (Array.isArray(value)) {
                rendered_value = `Array[${value.length}]`;
                array_size = value.length;
                array_type = "indexed";
                reference = i ? i : 0;
            }
            else if (value instanceof Map) {
                if (value instanceof variants_1.RawObject) {
                    rendered_value = `${value.class_name}`;
                }
                else {
                    rendered_value = `Dictionary[${value.size}]`;
                }
                array_size = value.size;
                array_type = "named";
                reference = i ? i : 0;
            }
            else {
                rendered_value = `${value.type_name()}${value.stringify_value()}`;
                reference = i ? i : 0;
            }
        }
        return {
            name: va.name,
            value: rendered_value,
            variablesReference: reference,
            array_size: array_size > 0 ? array_size : undefined,
            filter: array_type,
        };
    }
}
exports.GodotDebugSession = GodotDebugSession;
//# sourceMappingURL=debug_session.js.map