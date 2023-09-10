import { EventEmitter } from "events";
import * as vscode from 'vscode';
import { LanguageClient, RequestMessage } from "vscode-languageclient/node";
import logger from "../logger";
import { get_configuration, is_debug_mode } from "../utils";
import { Message, MessageIO, MessageIOReader, MessageIOWriter, TCPMessageIO, WebSocketMessageIO } from "./MessageIO";
import NativeDocumentManager from './NativeDocumentManager';

export enum ClientStatus {
	PENDING,
	DISCONNECTED,
	CONNECTED,
}
const CUSTOM_MESSAGE = "gdscrip_client/";

export default class GDScriptLanguageClient extends LanguageClient {

	public readonly io: MessageIO = (get_configuration("lsp.serverProtocol", "tcp") == "ws") ? new WebSocketMessageIO() : new TCPMessageIO();

	private context: vscode.ExtensionContext;
	private _started : boolean = false;
	private _status : ClientStatus;
	private _status_changed_callbacks: ((v : ClientStatus)=>void)[] = [];
	private _initialize_request: Message = null;
	private message_handler: MessageHandler = null;
	private native_doc_manager: NativeDocumentManager = null;

	public get started() : boolean { return this._started; }
	public get status() : ClientStatus { return this._status; }
	public set status(v : ClientStatus) {
		if (this._status != v) {
			this._status = v;
			for (const callback of this._status_changed_callbacks) {
				callback(v);
			}
		}
	}

	public watch_status(callback: (v : ClientStatus)=>void) {
		if (this._status_changed_callbacks.indexOf(callback) == -1) {
			this._status_changed_callbacks.push(callback);
		}
	}

	public open_documentation(symbolName: string) {
		this.native_doc_manager.request_documentation(symbolName);
	}

	constructor(context: vscode.ExtensionContext) {
		super(
			`GDScriptLanguageClient`,
			() => {
				return new Promise((resolve, reject) => {
					resolve({reader: new MessageIOReader(this.io), writer: new MessageIOWriter(this.io)});
				});
			},
			{
				// Register the server for plain text documents
				documentSelector: [
					{ scheme: "file", language: "gdscript" },
					{ scheme: "untitled", language: "gdscript" },
				],
				synchronize: {
					// Notify the server about file changes to '.gd files contain in the workspace
					// fileEvents: workspace.createFileSystemWatcher("**/*.gd"),
				},
			}
		);
		this.context = context;
		this.status = ClientStatus.PENDING;
		this.message_handler = new MessageHandler(this.io);
		this.io.on('disconnected', this.on_disconnected.bind(this));
		this.io.on('connected', this.on_connected.bind(this));
		this.io.on('message', this.on_message.bind(this));
		this.io.on('send_message', this.on_send_message.bind(this));
		this.native_doc_manager = new NativeDocumentManager(this.io);
	}

	connect_to_server() {
		this.status = ClientStatus.PENDING;
		let host = get_configuration("lsp.serverHost", "127.0.0.1");
		let port = get_configuration("lsp.serverPort", 6008);
		this.io.connect_to_language_server(host, port);
	}

	start(): vscode.Disposable {
		this._started = true;
		return super.start();
	}

	private on_send_message(message: Message) {
		if (is_debug_mode()) {
			logger.log("[client]", JSON.stringify(message));
		}
		if ((message as RequestMessage).method == "initialize") {
			this._initialize_request = message;
		}
	}

	private on_message(message: Message) {
		if (is_debug_mode()) {
			logger.log("[server]", JSON.stringify(message));
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

	private on_connected() {
		if (this._initialize_request) {
			this.io.writer.write(this._initialize_request);
		}
		this.status = ClientStatus.CONNECTED;
	}

	private on_disconnected() {
		this.status = ClientStatus.DISCONNECTED;
	}
}



class MessageHandler extends EventEmitter {

	private io: MessageIO = null;

	constructor(io: MessageIO) {
		super();
		this.io = io;
	}

	changeWorkspace(params: {path: string}) {
		vscode.window.showErrorMessage("The GDScript language server can't work properly!\nThe open workspace is different from the editor's.", 'Reload', 'Ignore').then(item=>{
			if (item == "Reload") {
				let folderUrl = vscode.Uri.file(params.path);
				vscode.commands.executeCommand('vscode.openFolder', folderUrl, false);
			}
		});
	}

	on_message(message: any) {

		// FIXME: Hot fix VSCode 1.42 hover position
		if (message && message.result && message.result.range && message.result.contents) {
			message.result.range = undefined;
		}

		if (message && message.method && (message.method as string).startsWith(CUSTOM_MESSAGE)) {
			const method = (message.method as string).substring(CUSTOM_MESSAGE.length, message.method.length);
			if (this[method]) {
				let ret = this[method](message.params);
				if (ret) {
					this.io.writer.write(ret);
				}
			}
		}
	}
}
