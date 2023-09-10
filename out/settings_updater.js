"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldUpdateSettings = exports.updateStoredVersion = exports.updateOldStyleSettings = void 0;
const vscode = require("vscode");
const OLD_SETTINGS_CONVERSIONS = [
    ["godot_tools.gdscript_lsp_server_protocol", "godotTools.lsp.serverProtocol"],
    ["godot_tools.gdscript_lsp_server_host", "godotTools.lsp.serverHost"],
    ["godot_tools.gdscript_lsp_server_port", "godotTools.lsp.serverPort"],
    ["godot_tools.editor_path", "godotTools.editorPath"],
    ["godot_tools.scene_file_config", "godotTools.sceneFileConfig"],
    ["godot_tools.reconnect_automatically", "godotTools.lsp.autoReconnect.enabled"],
    ["godot_tools.reconnect_cooldown", "godotTools.lsp.autoReconnect.cooldown"],
    ["godot_tools.reconnect_attempts", "godotTools.lsp.autoReconnect.attempts"],
    ["godot_tools.force_visible_collision_shapes", "godotTools.forceVisibleCollisionShapes"],
    ["godot_tools.force_visible_nav_mesh", "godotTools.forceVisibleNavMesh"],
    ["godot_tools.native_symbol_placement", "godotTooPtabls.nativeSymbolPlacement"],
    ["godot_tools.scenePreview.previewRelatedScenes", "godotTools.scenePreview.previewRelatedScenes"]
];
function updateOldStyleSettings() {
    let configuration = vscode.workspace.getConfiguration();
    let settings_changed = false;
    for (let [old_style_key, new_style_key] of OLD_SETTINGS_CONVERSIONS) {
        let value = configuration.get(old_style_key);
        if (value === undefined) {
            continue;
        }
        configuration.update(old_style_key, undefined, true);
        configuration.update(new_style_key, value, true);
        settings_changed = true;
    }
    if (settings_changed) {
        // Only show this message if things have actually changed, to prevent users who
        // are just reinstalling the extension from receiveing it.
        vscode.window.showInformationMessage(`Settings from godot-tools version <1.4.0 have been updated to the new format.
			Please view the changelog for version 1.4.0 for more information.`, 'Okay');
    }
}
exports.updateOldStyleSettings = updateOldStyleSettings;
/**
 * Stores the current version of the extension to `context.globalState`,
 * which persists across restarts & updates.
 */
function updateStoredVersion(context) {
    const syncedVersion = vscode.extensions.getExtension(context.extension.id)
        .packageJSON.version;
    context.globalState.update("previousVersion", syncedVersion);
}
exports.updateStoredVersion = updateStoredVersion;
/**
 * Checks if settings should try and be converted from the <1.4.0 style.
 *
 * Returns `true` if the extension has no value saved for `localVersion`
 * in `context.globalState`, meaning it was either just installed,
 *  or updated from a version <1.4.0. Otherwise, returns `false`.
 */
function shouldUpdateSettings(context) {
    const localVersion = context.globalState.get("previousVersion");
    return localVersion === undefined;
}
exports.shouldUpdateSettings = shouldUpdateSettings;
//# sourceMappingURL=settings_updater.js.map