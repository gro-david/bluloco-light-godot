"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SceneNode = exports.SceneTreeProvider = void 0;
const vscode_1 = require("vscode");
const path = require("path");
const fs = require("fs");
class SceneTreeProvider {
    constructor() {
        this._on_did_change_tree_data = new vscode_1.EventEmitter();
        this.onDidChangeTreeData = this
            ._on_did_change_tree_data.event;
    }
    fill_tree(tree) {
        this.tree = tree;
        this._on_did_change_tree_data.fire(undefined);
    }
    getChildren(element) {
        if (!this.tree) {
            return Promise.resolve([]);
        }
        if (!element) {
            return Promise.resolve([this.tree]);
        }
        else {
            return Promise.resolve(element.children);
        }
    }
    getTreeItem(element) {
        let has_children = element.children.length > 0;
        let tree_item;
        tree_item = new vscode_1.TreeItem(element.label, has_children
            ? element === this.tree
                ? vscode_1.TreeItemCollapsibleState.Expanded
                : vscode_1.TreeItemCollapsibleState.Collapsed
            : vscode_1.TreeItemCollapsibleState.None);
        tree_item.description = element.class_name;
        tree_item.iconPath = element.iconPath;
        return tree_item;
    }
}
exports.SceneTreeProvider = SceneTreeProvider;
function match_icon_to_class(class_name) {
    let icon_name = `icon${class_name
        .replace(/(2|3)D/, "$1d")
        .replace(/([A-Z0-9])/g, "_$1")
        .toLowerCase()}.svg`;
    return icon_name;
}
class SceneNode extends vscode_1.TreeItem {
    constructor(label, class_name, object_id, children, collapsibleState) {
        super(label, collapsibleState);
        this.label = label;
        this.class_name = class_name;
        this.object_id = object_id;
        this.children = children;
        this.collapsibleState = collapsibleState;
        let light = path.join(__filename, "..", "..", "..", "..", "resources", "light", match_icon_to_class(class_name));
        if (!fs.existsSync(light)) {
            path.join(__filename, "..", "..", "..", "..", "resources", "light", "node.svg");
        }
        let dark = path.join(__filename, "..", "..", "..", "..", "resources", "dark", match_icon_to_class(class_name));
        if (!fs.existsSync(light)) {
            path.join(__filename, "..", "..", "..", "..", "resources", "dark", "node.svg");
        }
        this.iconPath = {
            light: light,
            dark: dark,
        };
    }
}
exports.SceneNode = SceneNode;
//# sourceMappingURL=scene_tree_provider.js.map