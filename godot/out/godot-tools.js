"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GodotTools = void 0;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const GDScriptLanguageClient_1 = require("./lsp/GDScriptLanguageClient");
const utils_1 = require("./utils");
const CONFIG_CONTAINER = "godot_tools";
const TOOL_NAME = "GodotTools";
class GodotTools {
    constructor(p_context) {
        this.reconnection_attempts = 0;
        this.client = null;
        // deprecated, need to replace with "vscode.workspace.workspaceFolders", but
        // that's an array and not a single value
        this.workspace_dir = vscode.workspace.rootPath;
        this.project_file_name = "project.godot";
        this.project_file = "";
        this.project_dir = "";
        this.connection_status = null;
        this.retry = false;
        this.context = p_context;
        this.client = new GDScriptLanguageClient_1.default(p_context);
        this.client.watch_status(this.on_client_status_changed.bind(this));
        this.connection_status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
        setInterval(() => {
            this.retry_callback();
        }, utils_1.get_configuration("reconnect_cooldown", 3000));
    }
    activate() {
        vscode.commands.registerCommand("godot-tool.open_editor", () => {
            this.open_workspace_with_editor("-e").catch(err => vscode.window.showErrorMessage(err));
        });
        vscode.commands.registerCommand("godot-tool.run_project", () => {
            this.open_workspace_with_editor().catch(err => vscode.window.showErrorMessage(err));
        });
        vscode.commands.registerCommand("godot-tool.run_project_debug", () => {
            this.open_workspace_with_editor("--debug-collisions --debug-navigation").catch(err => vscode.window.showErrorMessage(err));
        });
        vscode.commands.registerCommand("godot-tool.check_status", this.check_client_status.bind(this));
        vscode.commands.registerCommand("godot-tool.set_scene_file", this.set_scene_file.bind(this));
        vscode.commands.registerCommand("godot-tool.copy_resource_path_context", this.copy_resource_path.bind(this));
        vscode.commands.registerCommand("godot-tool.copy_resource_path", this.copy_resource_path.bind(this));
        this.connection_status.text = "$(sync) Initializing";
        this.connection_status.command = "godot-tool.check_status";
        this.connection_status.show();
        // TODO: maybe cache this result somehow
        const klaw = require('klaw');
        klaw(this.workspace_dir)
            .on('data', item => {
            if (path.basename(item.path) == this.project_file_name) {
                this.project_dir = path.dirname(item.path);
                this.project_file = item.path;
            }
        });
        this.reconnection_attempts = 0;
        this.client.connect_to_server();
    }
    deactivate() {
        this.client.stop();
    }
    open_workspace_with_editor(params = "") {
        return new Promise((resolve, reject) => {
            let valid = false;
            if (this.project_dir) {
                let cfg = this.project_file;
                valid = (fs.existsSync(cfg) && fs.statSync(cfg).isFile());
            }
            if (valid) {
                this.run_editor(`--path "${this.project_dir}" ${params}`).then(() => resolve()).catch(err => {
                    reject(err);
                });
            }
            else {
                reject("Current workspace is not a Godot project");
            }
        });
    }
    copy_resource_path(uri) {
        if (!this.project_dir) {
            return;
        }
        if (!uri) {
            uri = vscode.window.activeTextEditor.document.uri;
        }
        let relative_path = path.normalize(path.relative(this.project_dir, uri.fsPath));
        relative_path = relative_path.split(path.sep).join(path.posix.sep);
        relative_path = 'res://' + relative_path;
        vscode.env.clipboard.writeText(relative_path);
    }
    set_scene_file(uri) {
        let right_clicked_scene_path = uri.fsPath;
        let scene_config = utils_1.get_configuration("scene_file_config");
        if (scene_config == right_clicked_scene_path) {
            scene_config = "";
        }
        else {
            scene_config = right_clicked_scene_path;
        }
        utils_1.set_configuration("scene_file_config", scene_config);
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
            let editorPath = utils_1.get_configuration("editor_path", "");
            editorPath = editorPath.replace("${workspaceRoot}", this.workspace_dir);
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
                        utils_1.set_configuration("editor_path", path);
                    }
                });
            }
            else {
                run_godot(editorPath, params);
            }
        });
    }
    check_client_status() {
        let host = utils_1.get_configuration("gdscript_lsp_server_host", "localhost");
        let port = utils_1.get_configuration("gdscript_lsp_server_port", 6008);
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
        let host = utils_1.get_configuration("gdscript_lsp_server_host", "localhost");
        let port = utils_1.get_configuration("gdscript_lsp_server_port", 6008);
        switch (status) {
            case GDScriptLanguageClient_1.ClientStatus.PENDING:
                this.connection_status.text = `$(sync) Connecting`;
                this.connection_status.tooltip = `Connecting to the GDScript language server at ${host}:${port}`;
                break;
            case GDScriptLanguageClient_1.ClientStatus.CONNECTED:
                this.retry = false;
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
        const auto_retry = utils_1.get_configuration("reconnect_automatically", true);
        const max_attempts = utils_1.get_configuration("reconnect_attempts", 10);
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
        let host = utils_1.get_configuration("gdscript_lsp_server_host", "localhost");
        let port = utils_1.get_configuration("gdscript_lsp_server_port", 6008);
        let message = `Couldn't connect to the GDScript language server at ${host}:${port}. Is the Godot editor running?`;
        vscode.window.showErrorMessage(message, 'Open Godot Editor', 'Retry', 'Ignore').then(item => {
            if (item == 'Retry') {
                this.reconnection_attempts = 0;
                this.client.connect_to_server();
            }
            else if (item == 'Open Godot Editor') {
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