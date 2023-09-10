"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientStatus = void 0;
const events_1 = require("events");
const vscode = require("vscode");
const node_1 = require("vscode-languageclient/node");
const logger_1 = require("../logger");
const utils_1 = require("../utils");
const MessageIO_1 = require("./MessageIO");
const NativeDocumentManager_1 = require("./NativeDocumentManager");
var ClientStatus;
(function (ClientStatus) {
    ClientStatus[ClientStatus["PENDING"] = 0] = "PENDING";
    ClientStatus[ClientStatus["DISCONNECTED"] = 1] = "DISCONNECTED";
    ClientStatus[ClientStatus["CONNECTED"] = 2] = "CONNECTED";
})(ClientStatus = exports.ClientStatus || (exports.ClientStatus = {}));
const CUSTOM_MESSAGE = "gdscrip_client/";
class GDScriptLanguageClient extends node_1.LanguageClient {
    constructor(context) {
        super(`GDScriptLanguageClient`, () => {
            return new Promise((resolve, reject) => {
                resolve({ reader: new MessageIO_1.MessageIOReader(this.io), writer: new MessageIO_1.MessageIOWriter(this.io) });
            });
        }, {
            // Register the server for plain text documents
            documentSelector: [
                { scheme: "file", language: "gdscript" },
                { scheme: "untitled", language: "gdscript" },
            ],
            synchronize: {
            // Notify the server about file changes to '.gd files contain in the workspace
            // fileEvents: workspace.createFileSystemWatcher("**/*.gd"),
            },
        });
        this.io = (utils_1.get_configuration("lsp.serverProtocol", "tcp") == "ws") ? new MessageIO_1.WebSocketMessageIO() : new MessageIO_1.TCPMessageIO();
        this._started = false;
        this._status_changed_callbacks = [];
        this._initialize_request = null;
        this.message_handler = null;
        this.native_doc_manager = null;
        this.context = context;
        this.status = ClientStatus.PENDING;
        this.message_handler = new MessageHandler(this.io);
        this.io.on('disconnected', this.on_disconnected.bind(this));
        this.io.on('connected', this.on_connected.bind(this));
        this.io.on('message', this.on_message.bind(this));
        this.io.on('send_message', this.on_send_message.bind(this));
        this.native_doc_manager = new NativeDocumentManager_1.default(this.io);
    }
    get started() { return this._started; }
    get status() { return this._status; }
    set status(v) {
        if (this._status != v) {
            this._status = v;
            for (const callback of this._status_changed_callbacks) {
                callback(v);
            }
        }
    }
    watch_status(callback) {
        if (this._status_changed_callbacks.indexOf(callback) == -1) {
            this._status_changed_callbacks.push(callback);
        }
    }
    open_documentation(symbolName) {
        this.native_doc_manager.request_documentation(symbolName);
    }
    connect_to_server() {
        this.status = ClientStatus.PENDING;
        let host = utils_1.get_configuration("lsp.serverHost", "127.0.0.1");
        let port = utils_1.get_configuration("lsp.serverPort", 6008);
        this.io.connect_to_language_server(host, port);
    }
    start() {
        this._started = true;
        return super.start();
    }
    on_send_message(message) {
        if (utils_1.is_debug_mode()) {
            logger_1.default.log("[client]", JSON.stringify(message));
        }
        if (message.method == "initialize") {
            this._initialize_request = message;
        }
    }
    on_message(message) {
        if (utils_1.is_debug_mode()) {
            logger_1.default.log("[server]", JSON.stringify(message));
        }
        // This is a dirty hack to fix the language server sending us
        // invalid file URIs
        // This should be forward-compatible, meaning that it will work
        // with the current broken version, AND the fixed future version.
        const match = JSON.stringify(message).match(/"target":"file:\/\/[^\/][^"]*"/);
        if (match) {
            for (let i = 0; i < message["result"].length; i++) {
                const x = message["result"][i]["target"];
                message["result"][i]["target"] = x.replace('file://', 'file:///');
            }
        }
        this.message_handler.on_message(message);
    }
    on_connected() {
        if (this._initialize_request) {
            this.io.writer.write(this._initialize_request);
        }
        this.status = ClientStatus.CONNECTED;
    }
    on_disconnected() {
        this.status = ClientStatus.DISCONNECTED;
    }
}
exports.default = GDScriptLanguageClient;
class MessageHandler extends events_1.EventEmitter {
    constructor(io) {
        super();
        this.io = null;
        this.io = io;
    }
    changeWorkspace(params) {
        vscode.window.showErrorMessage("The GDScript language server can't work properly!\nThe open workspace is different from the editor's.", 'Reload', 'Ignore').then(item => {
            if (item == "Reload") {
                let folderUrl = vscode.Uri.file(params.path);
                vscode.commands.executeCommand('vscode.openFolder', folderUrl, false);
            }
        });
    }
    on_message(message) {
        // FIXME: Hot fix VSCode 1.42 hover position
        if (message && message.result && message.result.range && message.result.contents) {
            message.result.range = undefined;
        }
        if (message && message.method && message.method.startsWith(CUSTOM_MESSAGE)) {
            const method = message.method.substring(CUSTOM_MESSAGE.length, message.method.length);
            if (this[method]) {
                let ret = this[method](message.params);
                if (ret) {
                    this.io.writer.write(ret);
                }
            }
        }
    }
}
//# sourceMappingURL=GDScriptLanguageClient.js.map