import * as xclip from "xclip";
import { htmlToMarkdown } from "./markdown";
import * as vscode from "vscode";
import path from "path";


export async function mdPaste(){
    const shell = xclip.getShell();
    const cb = shell.getClipboard();
    const ctxType = await getType(cb);
    console.log(ctxType);
    switch (ctxType){
        case xclip.ClipboardType.Html:
            pasteHtml(cb);
            break;
        case xclip.ClipboardType.Text:
            pasteText(cb);
            break;
        case xclip.ClipboardType.Image:
            pasteImage(cb);
            break;
    }
}

async function pasteHtml(cb: xclip.IClipboard){
    const html = await cb.getTextHtml();
    const markdown = htmlToMarkdown(html);
    writeToEditor(markdown);
}

async function pasteText(cb: xclip.IClipboard){
    const text = await cb.getTextPlain();
    writeToEditor(text);
}

async function pasteImage(cb: xclip.IClipboard){
    const folderPath = await createImageFolder();
    if (!folderPath){
        return;
    }
    const fileName = path.join(folderPath.fsPath, generateUUID() + ".png");
    const imagePath = await cb.getImage(fileName);
    const relativeImagePath = makeRelativePath(imagePath);

    const markdown = `![image](${relativeImagePath})`;
    writeToEditor(markdown);
}

export async function getType(cb: xclip.IClipboard) {
    const type = await  cb.getContentType();
    if (!(type instanceof Set)) {
        return type;
      }
      
    const priorityOrdering = [xclip.ClipboardType.Html,
                              xclip.ClipboardType.Text,
                              xclip.ClipboardType.Image];
    for (const theType of priorityOrdering){
        if (type.has(theType)){ 
            return theType;
          };
    }
    return xclip.ClipboardType.Unknown;
}


async function createImageFolder(){
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const document = editor.document;
        let imageFolder:vscode.Uri;
        if(document.uri.scheme !== "file"){
            const tempDir = require('os').tmpdir();
            imageFolder = vscode.Uri.file(tempDir);
        }else{
            imageFolder = document.uri.with({path: document.uri.path + "_images"});

        }
        await vscode.workspace.fs.createDirectory(imageFolder);
        return imageFolder;
    }
}

export async function writeToEditor(text: string) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const document = editor.document;
        const position = editor.selection.start;
        const edit = new vscode.TextEdit(new vscode.Range(position, position), text);
        const workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.set(document.uri, [edit]);
        await vscode.workspace.applyEdit(workspaceEdit);
    }
}


function makeRelativePath(to: string): string | null {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const documentPath = editor.document.uri.fsPath;
        const relativePath = path.relative(path.dirname(documentPath), to);
        if (relativePath.startsWith('..')) {
            return null;
        }
        return relativePath;
    }
    return null;
}

function generateUUID() {
    let dt = new Date().getTime();
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = (dt + Math.random() * 16) % 16 | 0;
        dt = Math.floor(dt / 16);
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
}

