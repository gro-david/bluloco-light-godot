"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandMessageSceneTree = void 0;
const command_1 = require("../command");
const mediator_1 = require("../../mediator");
const scene_tree_provider_1 = require("../../scene_tree/scene_tree_provider");
class CommandMessageSceneTree extends command_1.Command {
    trigger(parameters) {
        let scene = this.parse_next(parameters, { offset: 0 });
        mediator_1.Mediator.notify("scene_tree", [scene]);
    }
    parse_next(params, ofs) {
        let child_count = params[ofs.offset++];
        let name = params[ofs.offset++];
        let class_name = params[ofs.offset++];
        let id = params[ofs.offset++];
        let children = [];
        for (let i = 0; i < child_count; ++i) {
            children.push(this.parse_next(params, ofs));
        }
        return new scene_tree_provider_1.SceneNode(name, class_name, id, children);
    }
}
exports.CommandMessageSceneTree = CommandMessageSceneTree;
//# sourceMappingURL=command_message_scene_tree.js.map