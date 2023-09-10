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
exports.GDDocumentLinkProvider = void 0;
const vscode = require("vscode");
const vscode_1 = require("vscode");
const utils_1 = require("./utils");
class GDDocumentLinkProvider {
    constructor(context) {
        this.context = context;
        const disp = vscode.languages.registerDocumentLinkProvider(["gdresource"], this);
        context.subscriptions.push(disp);
    }
    provideDocumentLinks(document, token) {
        return __awaiter(this, void 0, void 0, function* () {
            let links = [];
            let lines = document.getText().split("\n");
            for (let i = 0; i < lines.length; i++) {
                const match = lines[i].match(/res:\/\/[^"^']*/);
                if (match) {
                    const start = new vscode_1.Position(i, match.index);
                    const end = new vscode_1.Position(i, match.index + match[0].length);
                    const r = new vscode_1.Range(start, end);
                    const uri = yield utils_1.convert_resource_path_to_uri(match[0]);
                    if (uri instanceof vscode_1.Uri) {
                        links.push(new vscode.DocumentLink(r, uri));
                    }
                }
            }
            return links;
        });
    }
}
exports.GDDocumentLinkProvider = GDDocumentLinkProvider;
//# sourceMappingURL=document_link_provider.js.map