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
exports.MessageIOWriter = exports.MessageIOReader = exports.TCPMessageIO = exports.WebSocketMessageIO = exports.MessageIO = void 0;
const vscode_jsonrpc_1 = require("vscode-jsonrpc");
const events_1 = require("events");
const ws_1 = require("ws");
const net_1 = require("net");
const MessageBuffer_1 = require("./MessageBuffer");
const vscode_jsonrpc_2 = require("vscode-jsonrpc");
class MessageIO extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.reader = null;
        this.writer = null;
    }
    send_message(message) {
        // virtual
    }
    on_message(chunk) {
        let message = chunk.toString();
        this.emit('data', message);
    }
    on_send_message(message) {
        this.emit("send_message", message);
    }
    on_message_callback(message) {
        this.emit("message", message);
    }
    connect_to_language_server(host, port) {
        return __awaiter(this, void 0, void 0, function* () {
            // virtual
        });
    }
}
exports.MessageIO = MessageIO;
class WebSocketMessageIO extends MessageIO {
    constructor() {
        super(...arguments);
        this.socket = null;
    }
    send_message(message) {
        if (this.socket) {
            this.socket.send(message);
        }
    }
    connect_to_language_server(host, port) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.socket = null;
                const ws = new ws_1.WebSocket(`ws://${host}:${port}`);
                ws.on('open', () => { this.on_connected(ws); resolve(); });
                ws.on('message', this.on_message.bind(this));
                ws.on('error', this.on_disconnected.bind(this));
                ws.on('close', this.on_disconnected.bind(this));
            });
        });
    }
    on_connected(socket) {
        this.socket = socket;
        this.emit("connected");
    }
    on_disconnected() {
        this.socket = null;
        this.emit('disconnected');
    }
}
exports.WebSocketMessageIO = WebSocketMessageIO;
class TCPMessageIO extends MessageIO {
    constructor() {
        super(...arguments);
        this.socket = null;
    }
    send_message(message) {
        if (this.socket) {
            this.socket.write(message);
        }
    }
    connect_to_language_server(host, port) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.socket = null;
                const socket = new net_1.Socket();
                socket.connect(port, host);
                socket.on('connect', () => { this.on_connected(socket); resolve(); });
                socket.on('data', this.on_message.bind(this));
                socket.on('end', this.on_disconnected.bind(this));
                socket.on('close', this.on_disconnected.bind(this));
            });
        });
    }
    on_connected(socket) {
        this.socket = socket;
        this.emit("connected");
    }
    on_disconnected() {
        this.socket = null;
        this.emit('disconnected');
    }
}
exports.TCPMessageIO = TCPMessageIO;
class MessageIOReader extends vscode_jsonrpc_1.AbstractMessageReader {
    constructor(io, encoding = 'utf8') {
        super();
        this.io = io;
        this.io.reader = this;
        this.buffer = new MessageBuffer_1.default(encoding);
        this._partialMessageTimeout = 10000;
    }
    set partialMessageTimeout(timeout) {
        this._partialMessageTimeout = timeout;
    }
    get partialMessageTimeout() {
        return this._partialMessageTimeout;
    }
    listen(callback) {
        this.nextMessageLength = -1;
        this.messageToken = 0;
        this.partialMessageTimer = undefined;
        this.callback = callback;
        this.io.on('data', (data) => {
            this.onData(data);
        });
        this.io.on('error', (error) => this.fireError(error));
        this.io.on('close', () => this.fireClose());
        return;
    }
    onData(data) {
        this.buffer.append(data);
        while (true) {
            if (this.nextMessageLength === -1) {
                let headers = this.buffer.tryReadHeaders();
                if (!headers) {
                    return;
                }
                let contentLength = headers['Content-Length'];
                if (!contentLength) {
                    throw new Error('Header must provide a Content-Length property.');
                }
                let length = parseInt(contentLength);
                if (isNaN(length)) {
                    throw new Error('Content-Length value must be a number.');
                }
                this.nextMessageLength = length;
                // Take the encoding form the header. For compatibility
                // treat both utf-8 and utf8 as node utf8
            }
            var msg = this.buffer.tryReadContent(this.nextMessageLength);
            if (msg === null) {
                /** We haven't received the full message yet. */
                this.setPartialMessageTimer();
                return;
            }
            this.clearPartialMessageTimer();
            this.nextMessageLength = -1;
            this.messageToken++;
            var json = JSON.parse(msg);
            this.callback(json);
            // callback
            this.io.on_message_callback(json);
        }
    }
    clearPartialMessageTimer() {
        if (this.partialMessageTimer) {
            clearTimeout(this.partialMessageTimer);
            this.partialMessageTimer = undefined;
        }
    }
    setPartialMessageTimer() {
        this.clearPartialMessageTimer();
        if (this._partialMessageTimeout <= 0) {
            return;
        }
        this.partialMessageTimer = setTimeout((token, timeout) => {
            this.partialMessageTimer = undefined;
            if (token === this.messageToken) {
                this.firePartialMessage({ messageToken: token, waitingTime: timeout });
                this.setPartialMessageTimer();
            }
        }, this._partialMessageTimeout, this.messageToken, this._partialMessageTimeout);
    }
}
exports.MessageIOReader = MessageIOReader;
const ContentLength = 'Content-Length: ';
const CRLF = '\r\n';
class MessageIOWriter extends vscode_jsonrpc_2.AbstractMessageWriter {
    constructor(io, encoding = 'utf8') {
        super();
        this.io = io;
        this.io.writer = this;
        this.encoding = encoding;
        this.errorCount = 0;
        this.io.on('error', (error) => this.fireError(error));
        this.io.on('close', () => this.fireClose());
    }
    end() {
    }
    write(msg) {
        let json = JSON.stringify(msg);
        let contentLength = Buffer.byteLength(json, this.encoding);
        let headers = [
            ContentLength, contentLength.toString(), CRLF,
            CRLF
        ];
        try {
            // callback
            this.io.on_send_message(msg);
            // Header must be written in ASCII encoding
            this.io.send_message(headers.join(''));
            // Now write the content. This can be written in any encoding
            this.io.send_message(json);
            this.errorCount = 0;
        }
        catch (error) {
            this.errorCount++;
            this.fireError(error, msg, this.errorCount);
        }
        return;
    }
}
exports.MessageIOWriter = MessageIOWriter;
//# sourceMappingURL=MessageIO.js.map