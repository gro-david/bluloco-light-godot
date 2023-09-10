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
exports.SceneNode = exports.ScenePreviewProvider = void 0;
const vscode_1 = require("vscode");
const path = require("path");
const fs = require("fs");
const vscode = require("vscode");
const utils_1 = require("./utils");
const logger_1 = require("./logger");
function log(...messages) {
    logger_1.default.log("[scene preview]", messages);
}
class ScenePreviewProvider {
    constructor() {
        this.scenePreviewPinned = false;
        this.currentScene = "";
        this.externalResources = {};
        this.changeEvent = new vscode_1.EventEmitter();
        this.tree = vscode.window.createTreeView("scenePreview", {
            treeDataProvider: this,
        });
        this.tree.onDidChangeSelection(this.tree_selection_changed);
        vscode.commands.registerCommand("godotTools.scenePreview.pin", this.pin_preview.bind(this));
        vscode.commands.registerCommand("godotTools.scenePreview.unpin", this.unpin_preview.bind(this));
        vscode.commands.registerCommand("godotTools.scenePreview.copyNodePath", this.copy_node_path.bind(this));
        vscode.commands.registerCommand("godotTools.scenePreview.copyResourcePath", this.copy_resource_path.bind(this));
        vscode.commands.registerCommand("godotTools.scenePreview.openScene", this.open_scene.bind(this));
        vscode.commands.registerCommand("godotTools.scenePreview.openScript", this.open_script.bind(this));
        vscode.commands.registerCommand("godotTools.scenePreview.goToDefinition", this.go_to_definition.bind(this));
        vscode.commands.registerCommand("godotTools.scenePreview.refresh", () => this.refresh());
        vscode.window.onDidChangeActiveTextEditor(() => {
            vscode.commands.executeCommand("godotTools.scenePreview.refresh");
        });
        this.refresh();
    }
    get onDidChangeTreeData() {
        return this.changeEvent.event;
    }
    refresh() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.scenePreviewPinned) {
                return;
            }
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                let fileName = editor.document.uri.fsPath;
                const mode = utils_1.get_configuration("scenePreview.previewRelatedScenes");
                // attempt to find related scene
                if (!fileName.endsWith(".tscn")) {
                    const searchName = fileName.replace(".gd", ".tscn");
                    if (mode == "anyFolder") {
                        const relatedScene = yield utils_1.find_file(searchName);
                        if (!relatedScene) {
                            return;
                        }
                        fileName = relatedScene.fsPath;
                    }
                    if (mode == "sameFolder") {
                        if (fs.existsSync(searchName)) {
                            fileName = searchName;
                        }
                        else {
                            return;
                        }
                    }
                    if (mode == "off") {
                        return;
                    }
                }
                // don't attempt to parse non-scenes
                if (!fileName.endsWith(".tscn")) {
                    return;
                }
                // don't reparse the currently selected scene
                if (this.currentScene == fileName) {
                    // TODO: reparse the currentScene if it's changed
                    // ideas: store a hash? check last modified time?
                    return;
                }
                yield this.parse_scene(fileName);
                this.changeEvent.fire();
            }
        });
    }
    pin_preview() {
        this.scenePreviewPinned = true;
        utils_1.set_context("godotTools.context.scenePreviewPinned", true);
    }
    unpin_preview() {
        this.scenePreviewPinned = false;
        utils_1.set_context("godotTools.context.scenePreviewPinned", false);
        this.refresh();
    }
    copy_node_path(item) {
        if (item.unique) {
            vscode.env.clipboard.writeText("%" + item.label);
            return;
        }
        vscode.env.clipboard.writeText(item.relativePath);
    }
    copy_resource_path(item) {
        vscode.env.clipboard.writeText(item.resourcePath);
    }
    open_scene(item) {
        return __awaiter(this, void 0, void 0, function* () {
            const uri = yield utils_1.convert_resource_path_to_uri(item.resourcePath);
            if (uri) {
                vscode.window.showTextDocument(uri, { preview: true });
            }
        });
    }
    open_script(item) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = this.externalResources[item.scriptId].path;
            const uri = yield utils_1.convert_resource_path_to_uri(id);
            if (uri) {
                vscode.window.showTextDocument(uri, { preview: true });
            }
        });
    }
    go_to_definition(item) {
        return __awaiter(this, void 0, void 0, function* () {
            const document = yield vscode.workspace.openTextDocument(this.currentScene);
            const start = document.positionAt(item.position);
            const end = document.positionAt(item.position + item.text.length);
            const range = new vscode.Range(start, end);
            vscode.window.showTextDocument(document, { selection: range });
        });
    }
    tree_selection_changed(event) {
        // const item = event.selection[0];
        // log(item.body);
        // const editor = vscode.window.activeTextEditor;
        // const range = editor.document.getText()
        // editor.revealRange(range)
    }
    parse_scene(scene) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            this.currentScene = scene;
            this.tree.message = path.basename(scene);
            const document = yield vscode.workspace.openTextDocument(scene);
            const text = document.getText();
            this.externalResources = {};
            const resourceRegex = /\[ext_resource.*/g;
            for (const match of text.matchAll(resourceRegex)) {
                const line = match[0];
                const type = (_a = line.match(/type="([\w]+)"/)) === null || _a === void 0 ? void 0 : _a[1];
                const path = (_b = line.match(/path="([\w.:/]+)"/)) === null || _b === void 0 ? void 0 : _b[1];
                const uid = (_c = line.match(/uid="([\w:/]+)"/)) === null || _c === void 0 ? void 0 : _c[1];
                const id = (_d = line.match(/id="([\w]+)"/)) === null || _d === void 0 ? void 0 : _d[1];
                this.externalResources[id] = {
                    path: path,
                    type: type,
                    uid: uid,
                    id: id,
                };
            }
            let root = "";
            let nodes = {};
            let lastNode = null;
            const nodeRegex = /\[node name="([\w]*)"(?: type="([\w]*)")?(?: parent="([\w\/.]*)")?(?: instance=ExtResource\(\s*"?([\w]+)"?\s*\))?\]/g;
            for (const match of text.matchAll(nodeRegex)) {
                let name = match[1];
                let type = match[2] ? match[2] : "PackedScene";
                let parent = match[3];
                let instance = match[4] ? match[4] : 0;
                let _path = "";
                let relativePath = "";
                if (parent == undefined) {
                    root = name;
                    _path = name;
                }
                else if (parent == ".") {
                    parent = root;
                    relativePath = name;
                    _path = parent + "/" + name;
                }
                else {
                    relativePath = parent + "/" + name;
                    parent = root + "/" + parent;
                    _path = parent + "/" + name;
                }
                if (lastNode) {
                    lastNode.body = text.slice(lastNode.position, match.index);
                    lastNode.parse_body();
                }
                let node = new SceneNode(name, type);
                node.path = _path;
                node.description = type;
                node.relativePath = relativePath;
                node.parent = parent;
                node.text = match[0];
                node.position = match.index;
                if (instance) {
                    if (instance in this.externalResources) {
                        node.tooltip = this.externalResources[instance].path;
                        node.resourcePath = this.externalResources[instance].path;
                        if (['.tscn'].includes(path.extname(node.resourcePath))) {
                            node.contextValue += "openable";
                        }
                    }
                    node.contextValue += "hasResourcePath";
                }
                if (_path == root) {
                    this.root = node;
                }
                if (parent in nodes) {
                    nodes[parent].children.push(node);
                }
                nodes[_path] = node;
                lastNode = node;
            }
            lastNode.body = text.slice(lastNode.position, text.length);
            lastNode.parse_body();
        });
    }
    getChildren(element) {
        if (!element) {
            if (!this.root) {
                return Promise.resolve([]);
            }
            else {
                return Promise.resolve([this.root]);
            }
        }
        else {
            return Promise.resolve(element.children);
        }
    }
    getTreeItem(element) {
        if (element.children.length > 0) {
            element.collapsibleState = vscode_1.TreeItemCollapsibleState.Expanded;
        }
        else {
            element.collapsibleState = vscode_1.TreeItemCollapsibleState.None;
        }
        return element;
    }
}
exports.ScenePreviewProvider = ScenePreviewProvider;
class SceneNode extends vscode_1.TreeItem {
    constructor(label, className, collapsibleState) {
        super(label, collapsibleState);
        this.label = label;
        this.className = className;
        this.collapsibleState = collapsibleState;
        this.unique = false;
        this.hasScript = false;
        this.scriptId = '';
        this.children = [];
        const iconDir = path.join(__filename, "..", "..", "resources", "godot_icons");
        const iconName = className + '.svg';
        this.iconPath = {
            light: path.join(iconDir, "light", iconName),
            dark: path.join(iconDir, "dark", iconName),
        };
    }
    parse_body() {
        const lines = this.body.split("\n");
        let newLines = [];
        let tags = [];
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            if (line.startsWith("tile_data")) {
                line = "tile_data = PoolIntArray(...)";
            }
            if (line.startsWith("unique_name_in_owner = true")) {
                tags.push("%");
                this.unique = true;
            }
            if (line.startsWith("script = ExtResource")) {
                tags.push("S");
                this.hasScript = true;
                this.scriptId = line.match(/script = ExtResource\(\s*"?([\w]+)"?\s*\)/)[1];
                this.contextValue += "hasScript";
            }
            if (line != "") {
                newLines.push(line);
            }
        }
        this.body = newLines.join("\n");
        let prefix = "";
        if (tags.length != 0) {
            prefix = tags.join(" ") + " | ";
        }
        this.description = prefix + this.description;
        const content = new vscode.MarkdownString();
        content.appendCodeblock(this.body, "gdresource");
        this.tooltip = content;
    }
}
exports.SceneNode = SceneNode;
//# sourceMappingURL=scene_preview_provider.js.map