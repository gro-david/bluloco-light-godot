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
exports.GodotTools = void 0;
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const document_link_provider_1 = require("./document_link_provider");
const GDScriptLanguageClient_1 = require("./lsp/GDScriptLanguageClient");
const scene_preview_provider_1 = require("./scene_preview_provider");
const utils_1 = require("./utils");
const TOOL_NAME = "GodotTools";
class GodotTools {
    constructor(p_context) {
        this.reconnection_attempts = 0;
        this.client = null;
        this.linkProvider = null;
        this.scenePreviewManager = null;
        this.connection_status = null;
        this.retry = false;
        this.context = p_context;
        this.client = new GDScriptLanguageClient_1.default(p_context);
        this.client.watch_status(this.on_client_status_changed.bind(this));
        this.connection_status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
        this.linkProvider = new document_link_provider_1.GDDocumentLinkProvider(p_context);
        setInterval(() => {
            this.retry_callback();
        }, utils_1.get_configuration("lsp.autoReconnect.cooldown", 3000));
    }
    activate() {
        vscode.commands.registerCommand("godotTools.openEditor", () => {
            this.open_workspace_with_editor("-e").catch(err => vscode.window.showErrorMessage(err));
        });
        vscode.commands.registerCommand("godotTools.runProject", () => {
            this.open_workspace_with_editor().catch(err => vscode.window.showErrorMessage(err));
        });
        vscode.commands.registerCommand("godotTools.runProjectDebug", () => {
            this.open_workspace_with_editor("--debug-collisions --debug-navigation").catch(err => vscode.window.showErrorMessage(err));
        });
        vscode.commands.registerCommand("godotTools.checkStatus", this.check_client_status.bind(this));
        vscode.commands.registerCommand("godotTools.setSceneFile", this.set_scene_file.bind(this));
        vscode.commands.registerCommand("godotTools.copyResourcePathContext", this.copy_resource_path.bind(this));
        vscode.commands.registerCommand("godotTools.copyResourcePath", this.copy_resource_path.bind(this));
        vscode.commands.registerCommand("godotTools.openTypeDocumentation", this.open_type_documentation.bind(this));
        vscode.commands.registerCommand("godotTools.switchSceneScript", this.switch_scene_script.bind(this));
        utils_1.set_context("godotTools.context.connectedToEditor", false);
        this.scenePreviewManager = new scene_preview_provider_1.ScenePreviewProvider();
        this.connection_status.text = "$(sync) Initializing";
        this.connection_status.command = "godotTools.checkStatus";
        this.connection_status.show();
        this.reconnection_attempts = 0;
        this.client.connect_to_server();
    }
    deactivate() {
        this.client.stop();
    }
    open_workspace_with_editor(params = "") {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let valid = false;
            let project_dir = '';
            let project_file = '';
            if (vscode.workspace.workspaceFolders != undefined) {
                const files = yield vscode.workspace.findFiles("**/project.godot");
                if (files) {
                    project_file = files[0].fsPath;
                    project_dir = path.dirname(project_file);
                    let cfg = project_file;
                    valid = (fs.existsSync(cfg) && fs.statSync(cfg).isFile());
                }
            }
            if (valid) {
                this.run_editor(`--path "${project_dir}" ${params}`).then(() => resolve()).catch(err => {
                    reject(err);
                });
            }
            else {
                reject("Current workspace is not a Godot project");
            }
        }));
    }
    copy_resource_path(uri) {
        if (!uri) {
            uri = vscode.window.activeTextEditor.document.uri;
        }
        const project_dir = path.dirname(utils_1.find_project_file(uri.fsPath));
        if (project_dir === null) {
            return;
        }
        let relative_path = path.normalize(path.relative(project_dir, uri.fsPath));
        relative_path = relative_path.split(path.sep).join(path.posix.sep);
        relative_path = "res://" + relative_path;
        vscode.env.clipboard.writeText(relative_path);
    }
    open_type_documentation(uri) {
        // get word under cursor
        const activeEditor = vscode.window.activeTextEditor;
        const document = activeEditor.document;
        const curPos = activeEditor.selection.active;
        const wordRange = document.getWordRangeAtPosition(curPos);
        const symbolName = document.getText(wordRange);
        this.client.open_documentation(symbolName);
    }
    switch_scene_script() {
        return __awaiter(this, void 0, void 0, function* () {
            let path = vscode.window.activeTextEditor.document.uri.fsPath;
            if (path.endsWith(".tscn")) {
                path = path.replace(".tscn", ".gd");
            }
            else if (path.endsWith(".gd")) {
                path = path.replace(".gd", ".tscn");
            }
            const file = yield utils_1.find_file(path);
            if (file) {
                vscode.window.showTextDocument(file);
            }
        });
    }
    set_scene_file(uri) {
        let right_clicked_scene_path = uri.fsPath;
        let scene_config = utils_1.get_configuration("sceneFileConfig");
        if (scene_config == right_clicked_scene_path) {
            scene_config = "";
        }
        else {
            scene_config = right_clicked_scene_path;
        }
        utils_1.set_configuration("sceneFileConfig", scene_config);
    }
    run_editor(params = "") {
        return new Promise((resolve, reject) => {
            const run_godot = (path, params) => {
                const is_powershell_path = (path) => {
                    const POWERSHELL = "powershell.exe";
                    const POWERSHELL_CORE = "pwsh.exe";
                    return path && (path.endsWith(POWERSHELL) || path.endsWith(POWERSHELL_CORE));
                };
                const escape_command = (cmd) => {
                    const cmdEsc = `"${cmd}"`;
                    if (process.platform === "win32") {
                        const shell_plugin = vscode.workspace.getConfiguration("terminal.integrated.shell");
                        if (shell_plugin) {
                            const shell = shell_plugin.get("windows");
                            if (shell) {
                                if (is_powershell_path(shell)) {
                                    return `&${cmdEsc}`;
                                }
                                else {
                                    return cmdEsc;
                                }
                            }
                        }
                        const POWERSHELL_SOURCE = "PowerShell";
                        const default_profile = vscode.workspace.getConfiguration("terminal.integrated.defaultProfile");
                        if (default_profile) {
                            const profile_name = default_profile.get("windows");
                            if (profile_name) {
                                if (POWERSHELL_SOURCE === profile_name) {
                                    return `&${cmdEsc}`;
                                }
                                const profiles = vscode.workspace.getConfiguration("terminal.integrated.profiles.windows");
                                const profile = profiles.get(profile_name);
                                if (profile) {
                                    if (POWERSHELL_SOURCE === profile.source || is_powershell_path(profile.path)) {
                                        return `&${cmdEsc}`;
                                    }
                                    else {
                                        return cmdEsc;
                                    }
                                }
                            }
                        }
                        // default for Windows if nothing is set is PowerShell
                        return `&${cmdEsc}`;
                    }
                    return cmdEsc;
                };
                let existingTerminal = vscode.window.terminals.find(t => t.name === TOOL_NAME);
                if (existingTerminal) {
                    existingTerminal.dispose();
                }
                let terminal = vscode.window.createTerminal(TOOL_NAME);
                let editorPath = escape_command(path);
                let cmmand = `${editorPath} ${params}`;
                terminal.sendText(cmmand, true);
                terminal.show();
                resolve();
            };
            let editorPath = utils_1.get_configuration("editorPath", "");
            if (!fs.existsSync(editorPath) || !fs.statSync(editorPath).isFile()) {
                vscode.window.showOpenDialog({
                    openLabel: "Run",
                    filters: process.platform === "win32" ? { "Godot Editor Binary": ["exe", "EXE"] } : undefined
                }).then((uris) => {
                    if (!uris) {
                        return;
                    }
                    let path = uris[0].fsPath;
                    if (!fs.existsSync(path) || !fs.statSync(path).isFile()) {
                        reject("Invalid editor path to run the project");
                    }
                    else {
                        run_godot(path, params);
                        utils_1.set_configuration("editorPath", path);
                    }
                });
            }
            else {
                run_godot(editorPath, params);
            }
        });
    }
    check_client_status() {
        let host = utils_1.get_configuration("lsp.serverPort", "localhost");
        let port = utils_1.get_configuration("lsp.serverHost", 6008);
        switch (this.client.status) {
            case GDScriptLanguageClient_1.ClientStatus.PENDING:
                vscode.window.showInformationMessage(`Connecting to the GDScript language server at ${host}:${port}`);
                break;
            case GDScriptLanguageClient_1.ClientStatus.CONNECTED:
                vscode.window.showInformationMessage("Connected to the GDScript language server.");
                break;
            case GDScriptLanguageClient_1.ClientStatus.DISCONNECTED:
                this.retry_connect_client();
                break;
        }
    }
    on_client_status_changed(status) {
        let host = utils_1.get_configuration("lsp.serverHost", "localhost");
        let port = utils_1.get_configuration("lsp.serverPort", 6008);
        switch (status) {
            case GDScriptLanguageClient_1.ClientStatus.PENDING:
                this.connection_status.text = `$(sync) Connecting`;
                this.connection_status.tooltip = `Connecting to the GDScript language server at ${host}:${port}`;
                break;
            case GDScriptLanguageClient_1.ClientStatus.CONNECTED:
                this.retry = false;
                utils_1.set_context("godotTools.context.connectedToEditor", true);
                this.connection_status.text = `$(check) Connected`;
                this.connection_status.tooltip = `Connected to the GDScript language server.`;
                if (!this.client.started) {
                    this.context.subscriptions.push(this.client.start());
                }
                break;
            case GDScriptLanguageClient_1.ClientStatus.DISCONNECTED:
                if (this.retry) {
                    this.connection_status.text = `$(sync) Connecting ` + this.reconnection_attempts;
                    this.connection_status.tooltip = `Connecting to the GDScript language server...`;
                }
                else {
                    utils_1.set_context("godotTools.context.connectedToEditor", false);
                    this.connection_status.text = `$(x) Disconnected`;
                    this.connection_status.tooltip = `Disconnected from the GDScript language server.`;
                }
                this.retry = true;
                break;
            default:
                break;
        }
    }
    retry_callback() {
        if (this.retry) {
            this.retry_connect_client();
        }
    }
    retry_connect_client() {
        const auto_retry = utils_1.get_configuration("lsp.autoReconnect.enabled", true);
        const max_attempts = utils_1.get_configuration("lsp.autoReconnect.attempts", 10);
        if (auto_retry && this.reconnection_attempts <= max_attempts) {
            this.reconnection_attempts++;
            this.client.connect_to_server();
            this.connection_status.text = `Connecting ` + this.reconnection_attempts;
            this.retry = true;
            return;
        }
        this.retry = false;
        this.connection_status.text = `$(x) Disconnected`;
        this.connection_status.tooltip = `Disconnected from the GDScript language server.`;
        let host = utils_1.get_configuration("lsp.serverHost", "localhost");
        let port = utils_1.get_configuration("lsp.serverPort", 6008);
        let message = `Couldn't connect to the GDScript language server at ${host}:${port}. Is the Godot editor running?`;
        vscode.window.showErrorMessage(message, "Open Godot Editor", "Retry", "Ignore").then(item => {
            if (item == "Retry") {
                this.reconnection_attempts = 0;
                this.client.connect_to_server();
            }
            else if (item == "Open Godot Editor") {
                this.client.status = GDScriptLanguageClient_1.ClientStatus.PENDING;
                this.open_workspace_with_editor("-e").then(() => {
                    setTimeout(() => {
                        this.reconnection_attempts = 0;
                        this.client.connect_to_server();
                    }, 10 * 1000);
                });
            }
        });
    }
}
exports.GodotTools = GodotTools;
//# sourceMappingURL=godot-tools.js.map