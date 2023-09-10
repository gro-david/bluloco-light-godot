"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.is_debug_mode = exports.set_configuration = exports.get_configuration = void 0;
const vscode = require("vscode");
const CONFIG_CONTAINER = "godot_tools";
function get_configuration(name, default_value = null) {
    return vscode.workspace.getConfiguration(CONFIG_CONTAINER).get(name, default_value) || default_value;
}
exports.get_configuration = get_configuration;
function set_configuration(name, value) {
    return vscode.workspace.getConfiguration(CONFIG_CONTAINER).update(name, value);
}
exports.set_configuration = set_configuration;
function is_debug_mode() {
    return process.env.VSCODE_DEBUG_MODE === "true";
}
exports.is_debug_mode = is_debug_mode;
//# sourceMappingURL=utils.js.map