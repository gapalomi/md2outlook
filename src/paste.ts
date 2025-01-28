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


async function getImageDescription(): Promise<string> {
    const options: vscode.InputBoxOptions = {
        prompt: "Enter image name",
        placeHolder: "Image name"
    };
    const imageName = await vscode.window.showInputBox(options);
    return imageName ? imageName.trim() : '';
}

async function pasteImage(cb: xclip.IClipboard) {
    const folderPath = await createImageFolder();
    if (!folderPath) {
        return;
    }
    const imageDescription = await getImageDescription();
    
    if (imageDescription === '') {
        vscode.window.showErrorMessage("Image name is required.");
        return;
    }

    const imageName = imageDescription.replace(/\s/g, '_');


    const fileName = path.join(folderPath.fsPath, imageName + ".png");

    // Check if file already exists
    if (await fileExists(fileName)) {
        const overwrite = await vscode.window.showWarningMessage(`File ${imageName}.png already exists. Overwrite?`, 'Yes', 'No');
        if (overwrite !== 'Yes') {
            return;
        }
    }

    const imagePath = await cb.getImage(fileName);
    const relativeImagePath = makeRelativePath(imagePath);

    const markdown = `![${imageDescription}](${relativeImagePath})`;
    writeToEditor(markdown);
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
        return true;
    } catch {
        return false;
    }
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
            const parsedPath = path.parse(document.uri.fsPath);
            imageFolder = document.uri.with({path: path.join(parsedPath.dir, "images_" + parsedPath.name).replace(/\\/g, '/')});

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
        const posixRelativePath = relativePath.split(path.sep).join(path.posix.sep);

        return posixRelativePath;
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

