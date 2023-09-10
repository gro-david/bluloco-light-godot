"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register_debugger = void 0;
const vscode_1 = require("vscode");
const debug_session_1 = require("./debug_session");
const fs = require("fs");
const scene_tree_provider_1 = require("./scene_tree/scene_tree_provider");
const inspector_provider_1 = require("./scene_tree/inspector_provider");
const mediator_1 = require("./mediator");
function register_debugger(context) {
    let provider = new GodotConfigurationProvider();
    context.subscriptions.push(vscode_1.debug.registerDebugConfigurationProvider("godot", provider));
    let inspector_provider = new inspector_provider_1.InspectorProvider();
    vscode_1.window.registerTreeDataProvider("inspect-node", inspector_provider);
    let scene_tree_provider = new scene_tree_provider_1.SceneTreeProvider();
    vscode_1.window.registerTreeDataProvider("active-scene-tree", scene_tree_provider);
    let factory = new GodotDebugAdapterFactory(scene_tree_provider);
    context.subscriptions.push(vscode_1.debug.registerDebugAdapterDescriptorFactory("godot", factory));
    vscode_1.commands.registerCommand("godotTools.debugger.inspectNode", (element) => {
        if (element instanceof scene_tree_provider_1.SceneNode) {
            mediator_1.Mediator.notify("inspect_object", [
                element.object_id,
                (class_name, variable) => {
                    inspector_provider.fill_tree(element.label, class_name, element.object_id, variable);
                },
            ]);
        }
        else if (element instanceof inspector_provider_1.RemoteProperty) {
            mediator_1.Mediator.notify("inspect_object", [
                element.object_id,
                (class_name, properties) => {
                    inspector_provider.fill_tree(element.label, class_name, element.object_id, properties);
                },
            ]);
        }
    });
    vscode_1.commands.registerCommand("godotTools.debugger.refreshSceneTree", () => {
        mediator_1.Mediator.notify("request_scene_tree", []);
    });
    vscode_1.commands.registerCommand("godotTools.debugger.refreshInspector", () => {
        if (inspector_provider.has_tree()) {
            let name = inspector_provider.get_top_name();
            let id = inspector_provider.get_top_id();
            mediator_1.Mediator.notify("inspect_object", [
                id,
                (class_name, properties) => {
                    inspector_provider.fill_tree(name, class_name, id, properties);
                },
            ]);
        }
    });
    vscode_1.commands.registerCommand("godotTools.debugger.editValue", (property) => {
        let previous_value = property.value;
        let type = typeof previous_value;
        let is_float = type === "number" && !Number.isInteger(previous_value);
        vscode_1.window
            .showInputBox({ value: `${property.description}` })
            .then((value) => {
            let new_parsed_value;
            switch (type) {
                case "string":
                    new_parsed_value = value;
                    break;
                case "number":
                    if (is_float) {
                        new_parsed_value = parseFloat(value);
                        if (isNaN(new_parsed_value)) {
                            return;
                        }
                    }
                    else {
                        new_parsed_value = parseInt(value);
                        if (isNaN(new_parsed_value)) {
                            return;
                        }
                    }
                    break;
                case "boolean":
                    if (value.toLowerCase() === "true" ||
                        value.toLowerCase() === "false") {
                        new_parsed_value = value.toLowerCase() === "true";
                    }
                    else if (value === "0" || value === "1") {
                        new_parsed_value = value === "1";
                    }
                    else {
                        return;
                    }
            }
            if (property.changes_parent) {
                let parents = [property.parent];
                let idx = 0;
                while (parents[idx].changes_parent) {
                    parents.push(parents[idx++].parent);
                }
                let changed_value = inspector_provider.get_changed_value(parents, property, new_parsed_value);
                mediator_1.Mediator.notify("changed_value", [
                    property.object_id,
                    parents[idx].label,
                    changed_value,
                ]);
            }
            else {
                mediator_1.Mediator.notify("changed_value", [
                    property.object_id,
                    property.label,
                    new_parsed_value,
                ]);
            }
            mediator_1.Mediator.notify("inspect_object", [
                inspector_provider.get_top_id(),
                (class_name, properties) => {
                    inspector_provider.fill_tree(inspector_provider.get_top_name(), class_name, inspector_provider.get_top_id(), properties);
                },
            ]);
        });
    });
    context.subscriptions.push(factory);
}
exports.register_debugger = register_debugger;
class GodotConfigurationProvider {
    resolveDebugConfiguration(folder, config, token) {
        if (!config.type && !config.request && !config.name) {
            const editor = vscode_1.window.activeTextEditor;
            if (editor && fs.existsSync(`${folder.uri.fsPath}/project.godot`)) {
                config.type = "godot";
                config.name = "Debug Godot";
                config.request = "launch";
                config.project = "${workspaceFolder}";
                config.port = 6007;
                config.address = "127.0.0.1";
                config.launch_game_instance = true;
                config.launch_scene = false;
                config.additional_options = "";
            }
        }
        if (!config.project) {
            return vscode_1.window
                .showInformationMessage("Cannot find a project.godot in active workspace.")
                .then(() => {
                return undefined;
            });
        }
        return config;
    }
}
class GodotDebugAdapterFactory {
    constructor(scene_tree_provider) {
        this.scene_tree_provider = scene_tree_provider;
    }
    createDebugAdapterDescriptor(session) {
        this.session = new debug_session_1.GodotDebugSession();
        this.session.set_scene_tree(this.scene_tree_provider);
        return new vscode_1.DebugAdapterInlineImplementation(this.session);
    }
    dispose() {
        this.session.dispose();
        this.session = undefined;
    }
}
//# sourceMappingURL=debugger_context.js.map