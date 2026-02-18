// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import path = require('path');
import * as vscode from 'vscode';
import * as fs from 'fs';
import { API as GitAPI, GitExtension, APIState, Remote } from './git'; 
let gContext: vscode.ExtensionContext;
import * as child_process from 'child_process';
import * as Handlebars from 'handlebars';
import { mdPaste } from './paste';
import { renderMarkdown } from './markdown';
import { markdownToConfluence } from './confluence';
import { replaceVsCodeLinksToGithub } from './githubLinks';
import * as xclip from "xclip";
import * as os from 'os';
import { URL } from 'url';
let DEFAULT_STYLESHEET = '';
import { exec } from 'child_process';



var loadedConfiguration: vscode.WorkspaceConfiguration;
function updateConfiguration() {
	vscode.workspace.getConfiguration('md2outlook');
}

function dedent(text: string): string {
    const lines = text.split('\n');
    let minIndent = Infinity;
    
    for (const line of lines) {
        if (line.trim().length === 0) {
            continue;
        }
        const match = line.match(/^\s*/);
        const indent = match ? match[0].length : 0;
        if (indent < minIndent) {
            minIndent = indent;
        }
    }
    
    if (minIndent === Infinity || minIndent === 0) {
        return text;
    }
    
    return lines.map(line => {
        if (line.trim().length === 0) {
            return '';
        }
        return line.substring(minIndent);
    }).join('\n');
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	gContext = context;
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "md2outlook" is now active!');


	loadedConfiguration = vscode.workspace.getConfiguration('md2outlook');        
	vscode.workspace.onDidChangeConfiguration(updateConfiguration);

	


	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('md2outlook.copyHtml', async () => {
		// get current editor text
		let editor = vscode.window.activeTextEditor;
        if (editor) {
			
			let text = editor.document.getText(editor.selection.isEmpty ? undefined : editor.selection);

			
            let html = renderMarkdown(text);

			let styleSheet = fs.readFileSync(path.join(gContext.extensionPath,'static', 'theme.css'), 'utf-8');;
			let cssPath:string|undefined = loadedConfiguration.get("cssPath");
			if (cssPath && fs.existsSync(cssPath)) {
				styleSheet = fs.readFileSync(cssPath).toString();
			}

			//WA to generate quotes
			html = html.replaceAll("<blockquote>", `<table width="80%" cellspacing="0" cellpadding="0" style="width:80%"><tr><td class="quote">`);
			html = html.replaceAll("</blockquote>", "</td></tr></table><p>&nbsp;</p>");
			html = html.replaceAll("<span ", `<span style="margin:auto" `);

			// Wrap code blocks in a table for Outlook border support
			html = html.replaceAll("<pre>", `<table width="80%" cellpadding="5" cellspacing="0" style="width:80%;background-color:#f6f8fa;border:1px solid #d0d7de;border-radius:3px;" bgcolor="#f6f8fa"><tr><td><pre style="margin:0;border:none;background-color:#f6f8fa;">`);
			html = html.replaceAll("</pre>", `</pre></td></tr></table><p>&nbsp;</p>`);

			let htmlTemplate = fs.readFileSync(path.join(gContext.extensionPath,'static', 'htmlTemplate.html'), 'utf-8');;
			let template = Handlebars.compile(htmlTemplate);
			let data = {title:editor.document.fileName, stylesheet:styleSheet, body:html};
			
			let htmlDocument = template(data);
			
			const regex = /<img src="(.*?)"/g;
			let match;
			while ((match = regex.exec(htmlDocument)) !== null) {
				let imgPath = match[1];
				let imagePath = path.join(vscode.Uri.file(path.dirname(editor.document.uri.fsPath)).fsPath, imgPath);
				if (fs.existsSync(imagePath)) {
					let imgData = fs.readFileSync(imagePath);
					let base64Image = Buffer.from(imgData).toString('base64');
					htmlDocument = htmlDocument.replace(match[0],`<img src="data:image/png;base64,${base64Image}"`);
				}
			}

            const tempDir = os.tmpdir();
            const tempFile = path.join(tempDir, `md2outlook_${Date.now()}.html`);
            fs.writeFileSync(tempFile, htmlDocument);
            const tempUrl = new URL(`file://${tempFile}`);

            const shell = xclip.getShell();
            const cb = shell.getClipboard();
            await cb.copyTextHtml(tempUrl);
            
            // Clean up temp file after a short delay to ensure clipboard tool has read it
            setTimeout(() => {
                if (fs.existsSync(tempFile)) {
                    fs.unlinkSync(tempFile);
                }
            }, 1000);

			vscode.window.showInformationMessage("Copied to Clipboard 📋");
        }
		
	});

	context.subscriptions.push(disposable);

	context.subscriptions.push(vscode.commands.registerCommand("md2outlook.newTempMarkdown", async () => {
		const date = new Date();
		const fileName = `${date.getTime()}_md2outlook.md`;
		const tempDir = require('os').tmpdir();
		const filePath = path.join(tempDir, fileName);
		const fileUri = vscode.Uri.file(filePath);

		await vscode.workspace.fs.writeFile(fileUri, new Uint8Array());
		const newFile = await vscode.workspace.openTextDocument(fileUri);
		const editor = await vscode.window.showTextDocument(newFile);
		await vscode.commands.executeCommand('markdown.showPreviewToSide', fileUri);
		await vscode.window.showTextDocument(editor.document, editor.viewColumn);
	}));

	context.subscriptions.push(vscode.commands.registerCommand("md2outlook.insertDate", () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const date = new Date().toLocaleDateString();
			editor.edit(editBuilder => {
				editBuilder.insert(editor.selection.active, date);
			});
		}
	}));

	context.subscriptions.push(vscode.commands.registerTextEditorCommand("md2outlook.openInWebBrowser", async (editor) => {
		let filePath = editor.document.uri.fsPath;

		if (editor.document.isUntitled || !filePath) {
			const fileName = `md2outlook_${Date.now()}.md`;
			filePath = path.join(os.tmpdir(), fileName);
			fs.writeFileSync(filePath, editor.document.getText(), 'utf-8');
		}

		const fileUrl = vscode.Uri.file(filePath).toString(true);

		exec(`start msedge "${fileUrl}"`, (error, stdout, stderr) => {
			if (error) {
				vscode.window.showErrorMessage(`Error opening file in Edge: ${error.message}`);
				return;
			}
			vscode.window.showInformationMessage("File opened in Edge browser");
		});
	}));

	context.subscriptions.push(vscode.commands.registerTextEditorCommand("md2outlook.copyVscodeMdFileLink", async (editor)=>{
		const selection = editor.selection;
		const text = editor.document.getText(selection);

		const editorUri = editor.document.uri; // Get the Uri of the current document
		const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri : null; // Get the Uri of the first workspace folder
		const relativePath = vscode.workspace.asRelativePath(editorUri, false); // Get the relative path to the workspace folder
		const filePath = editor.document.uri.fsPath.replaceAll("\\","\/");


		const mdLink = "vscode://file/" + filePath  + ":" + (selection.start.line+1).toString();
		let mdCopy = `[${relativePath  + ":" + (selection.start.line+1).toString()}](${mdLink})`;

		if(text.length > 0){

			if(selection.isSingleLine){
				mdCopy = `[\`${text}\`](${mdLink})`;
			}else{
				mdCopy = mdCopy + `
\`\`\` ${editor.document.languageId}
${text}
\`\`\``;
			}
			

		}
		
		vscode.env.clipboard.writeText(mdCopy);
		vscode.window.showInformationMessage(`📋 ${mdLink}`);
	}));

	context.subscriptions.push(vscode.commands.registerTextEditorCommand("md2outlook.copyGitMdFileLink", async (editor)=>{
		const selection = editor.selection;
		const text = editor.document.getText(selection);

		const editorUri = editor.document.uri; // Get the Uri of the current document
		const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri : null; // Get the Uri of the first workspace folder
		const relativePath = vscode.workspace.asRelativePath(editorUri, false); // Get the relative path to the workspace folder
		const filePath = editor.document.uri.fsPath.replaceAll("\\","\/");

		let url = "";
        try {
            const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');
            if(gitExtension){
                const gitAPI = gitExtension.exports.getAPI(1);
				for (const repo of gitAPI.repositories) {
					const repoPath = repo.rootUri.fsPath.replaceAll("\\","/");
					if(filePath.startsWith(repoPath)){
						let gitUrl = repo.state.remotes[0].fetchUrl?.replace(/\.git$/, '');
						const commit = repo.state.HEAD!.commit;
						url = `${gitUrl}/blob/${commit}${filePath.slice(repoPath.length)}#L${selection.start.line}`;

					}
				}
            }  
        } catch (error) {
            console.error(error);
			vscode.window.showErrorMessage(error as string);
        }

		if(url.length === 0){
			vscode.window.showErrorMessage("Problem getting remote url");
			return;
		}

		const mdLink = url;
		let mdCopy = `[${relativePath  + ":" + (selection.start.line+1).toString()}](${mdLink})`;

		if(text.length > 0){

			if(selection.isSingleLine){
				mdCopy = `[\`${text}\`](${mdLink})`;
			}else{
				mdCopy = mdCopy + `
\`\`\` ${editor.document.languageId}
${text}
\`\`\``;
			}
			

		}
		
		vscode.env.clipboard.writeText(mdCopy);
		vscode.window.showInformationMessage(`📋 ${mdLink}`);
	}));



	context.subscriptions.push(vscode.commands.registerCommand('md2outlook.copyConfluence', async () => {
		let editor = vscode.window.activeTextEditor;
        if (editor) {
			let text = editor.document.getText(editor.selection.isEmpty ? undefined : editor.selection);
			text = dedent(text);
            let confluence = markdownToConfluence(text);
			await vscode.env.clipboard.writeText(confluence);
			vscode.window.showInformationMessage("Confluence markup copied to clipboard 📋");
        }
	}));

	context.subscriptions.push(vscode.commands.registerCommand('md2outlook.vscodeLinksToGithub', async () => {
		await replaceVsCodeLinksToGithub();
	}));

	context.subscriptions.push(vscode.commands.registerCommand("md2outlook.paste", async () => {
		mdPaste();
	}));
}

// This method is called when your extension is deactivated
export function deactivate() {}
