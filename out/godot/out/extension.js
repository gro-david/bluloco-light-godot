"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const godot_tools_1 = require("./godot-tools");
const debuggerContext = require("./debugger/debugger_context");
let tools = null;
function activate(context) {
    tools = new godot_tools_1.GodotTools(context);
    tools.activate();
    debuggerContext.register_debugger(context);
}
exports.activate = activate;
function deactivate() {
    return new Promise((resolve, reject) => {
        tools.deactivate();
        resolve();
    });
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map