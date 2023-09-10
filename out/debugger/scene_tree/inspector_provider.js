"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteObject = exports.RemoteProperty = exports.InspectorProvider = void 0;
const vscode_1 = require("vscode");
const variants_1 = require("../variables/variants");
class InspectorProvider {
    constructor() {
        this._on_did_change_tree_data = new vscode_1.EventEmitter();
        this.onDidChangeTreeData = this
            ._on_did_change_tree_data.event;
    }
    clean_up() {
        if (this.tree) {
            this.tree = undefined;
            this._on_did_change_tree_data.fire(undefined);
        }
    }
    fill_tree(element_name, class_name, object_id, variable) {
        this.tree = this.parse_variable(variable, object_id);
        this.tree.label = element_name;
        this.tree.collapsibleState = vscode_1.TreeItemCollapsibleState.Expanded;
        this.tree.description = class_name;
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
            return Promise.resolve(element.properties);
        }
    }
    getTreeItem(element) {
        return element;
    }
    get_changed_value(parents, property, new_parsed_value) {
        let idx = parents.length - 1;
        let value = parents[idx].value;
        if (Array.isArray(value)) {
            let idx = parseInt(property.label);
            if (idx < value.length) {
                value[idx] = new_parsed_value;
            }
        }
        else if (value instanceof Map) {
            value.set(property.parent.value.key, new_parsed_value);
        }
        else if (value[property.label]) {
            value[property.label] = new_parsed_value;
        }
        return value;
    }
    get_top_id() {
        if (this.tree) {
            return this.tree.object_id;
        }
        return undefined;
    }
    get_top_name() {
        if (this.tree) {
            return this.tree.label;
        }
        return undefined;
    }
    has_tree() {
        return this.tree !== undefined;
    }
    parse_variable(va, object_id) {
        let value = va.value;
        let rendered_value = "";
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
            }
            else if (value instanceof Map) {
                if (value instanceof variants_1.RawObject) {
                    rendered_value = `${value.class_name}`;
                }
                else {
                    rendered_value = `Dictionary[${value.size}]`;
                }
            }
            else {
                rendered_value = `${value.type_name()}${value.stringify_value()}`;
            }
        }
        let child_props = [];
        if (value) {
            let sub_variables = typeof value["sub_values"] === "function" &&
                value instanceof variants_1.ObjectId === false
                ? value.sub_values()
                : Array.isArray(value)
                    ? value.map((va, i) => {
                        return { name: `${i}`, value: va };
                    })
                    : value instanceof Map
                        ? Array.from(value.keys()).map((va) => {
                            let name = typeof va["rendered_value"] === "function"
                                ? va.rendered_value()
                                : `${va}`;
                            let map_value = value.get(va);
                            return { name: name, value: map_value };
                        })
                        : [];
            child_props = sub_variables === null || sub_variables === void 0 ? void 0 : sub_variables.map((va) => {
                return this.parse_variable(va, object_id);
            });
        }
        let out_prop = new RemoteProperty(va.name, value, object_id, child_props, child_props.length === 0
            ? vscode_1.TreeItemCollapsibleState.None
            : vscode_1.TreeItemCollapsibleState.Collapsed);
        out_prop.description = rendered_value;
        out_prop.properties.forEach((prop) => {
            prop.parent = out_prop;
        });
        out_prop.description = rendered_value;
        if (value instanceof variants_1.ObjectId) {
            out_prop.contextValue = "remote_object";
            out_prop.object_id = Number(value.id);
        }
        else if (typeof value === "number" ||
            typeof value === "bigint" ||
            typeof value === "boolean" ||
            typeof value === "string") {
            out_prop.contextValue = "editable_value";
        }
        else if (Array.isArray(value) ||
            (value instanceof Map && value instanceof variants_1.RawObject === false)) {
            out_prop.properties.forEach((prop) => (prop.changes_parent = true));
        }
        return out_prop;
    }
}
exports.InspectorProvider = InspectorProvider;
class RemoteProperty extends vscode_1.TreeItem {
    constructor(label, value, object_id, properties, collapsibleState) {
        super(label, collapsibleState);
        this.label = label;
        this.value = value;
        this.object_id = object_id;
        this.properties = properties;
        this.collapsibleState = collapsibleState;
    }
}
exports.RemoteProperty = RemoteProperty;
class RemoteObject extends RemoteProperty {
}
exports.RemoteObject = RemoteObject;
//# sourceMappingURL=inspector_provider.js.map