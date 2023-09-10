"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GodotDebugData = void 0;
const mediator_1 = require("./mediator");
const path = require("path");
class GodotDebugData {
    constructor() {
        this.breakpoint_id = 0;
        this.breakpoints = new Map();
        this.last_frames = [];
        this.stack_count = 0;
        this.stack_files = [];
    }
    get_all_breakpoints() {
        let output = [];
        Array.from(this.breakpoints.values()).forEach((bp_array) => {
            output.push(...bp_array);
        });
        return output;
    }
    get_breakpoints(path) {
        return this.breakpoints.get(path) || [];
    }
    remove_breakpoint(path_to, line) {
        let bps = this.breakpoints.get(path_to);
        if (bps) {
            let index = bps.findIndex((bp) => {
                return bp.line === line;
            });
            if (index !== -1) {
                let bp = bps[index];
                bps.splice(index, 1);
                this.breakpoints.set(path_to, bps);
                let file = `res://${path.relative(this.project_path, bp.file)}`;
                mediator_1.Mediator.notify("remove_breakpoint", [
                    file.replace(/\\/g, "/"),
                    bp.line,
                ]);
            }
        }
    }
    set_breakpoint(path_to, line) {
        let bp = {
            file: path_to.replace(/\\/g, "/"),
            line: line,
            id: this.breakpoint_id++,
        };
        let bps = this.breakpoints.get(bp.file);
        if (!bps) {
            bps = [];
            this.breakpoints.set(bp.file, bps);
        }
        bps.push(bp);
        if (this.project_path) {
            let out_file = `res://${path.relative(this.project_path, bp.file)}`;
            mediator_1.Mediator.notify("set_breakpoint", [out_file.replace(/\\/g, "/"), line]);
        }
    }
}
exports.GodotDebugData = GodotDebugData;
//# sourceMappingURL=debug_runtime.js.map