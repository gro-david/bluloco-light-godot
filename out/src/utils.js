"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convert_resource_path_to_uri = exports.find_file = exports.find_project_file = exports.set_context = exports.is_debug_mode = exports.set_configuration = exports.get_configuration = void 0;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const CONFIG_CONTAINER = "godotTools";
function get_configuration(name, default_value = null) {
    let config_value = vscode.workspace.getConfiguration(CONFIG_CONTAINER).get(name, null);
    if (config_value === null) {
        return default_value;
    }
    return config_value;
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
function set_context(name, value) {
    vscode.commands.executeCommand("setContext", name, value);
}
exports.set_context = set_context;
function find_project_file(start, depth = 20) {
    // This function appears to be fast enough, but if speed is ever an issue,
    // memoizing the result should be straightforward
    const folder = path.dirname(start);
    if (start == folder) {
        return null;
    }
    const project_file = path.join(folder, "project.godot");
    if (fs.existsSync(project_file)) {
        return project_file;
    }
    else {
        if (depth === 0) {
            return null;
        }
        return find_project_file(folder, depth - 1);
    }
}
exports.find_project_file = find_project_file;
function find_file(file) {
    return __awaiter(this, void 0, void 0, function* () {
        if (fs.existsSync(file)) {
            return vscode.Uri.file(file);
        }
        else {
            const fileName = path.basename(file);
            const results = yield vscode.workspace.findFiles("**/" + fileName);
            if (results.length == 1) {
                return results[0];
            }
        }
        return null;
    });
}
exports.find_file = find_file;
function convert_resource_path_to_uri(resPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const files = yield vscode.workspace.findFiles("**/project.godot");
        if (!files) {
            return null;
        }
        const project_dir = files[0].fsPath.replace("project.godot", "");
        return vscode.Uri.joinPath(vscode.Uri.file(project_dir), resPath.substring(6));
    });
}
exports.convert_resource_path_to_uri = convert_resource_path_to_uri;
//# sourceMappingURL=utils.js.map