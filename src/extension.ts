// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import path = require('path');
import * as vscode from 'vscode';
import * as fs from 'fs';
import { API as GitAPI, GitExtension, APIState, Remote } from './git'; 
let gContext: vscode.ExtensionContext;
import * as child_process from 'child_process';
import * as Handlebars from 'handlebars';
let DEFAULT_STYLESHEET = '';


// enable everything
var hljs = require('highlight.js'); // https://highlightjs.org

// Actual default values
var md = require('markdown-it')({
  highlight: function (str:any, lang:any) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (__) {}
    }

    return ''; // use external default escaping
  }
}).use(require('markdown-it-mark'));;

var loadedConfiguration: vscode.WorkspaceConfiguration;
function updateConfiguration() {
	vscode.workspace.getConfiguration('md2outlook');
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
            let text = editor.document.getText();


            let html = md.render(text);

			let styleSheet = fs.readFileSync(path.join(gContext.extensionPath,'static', 'theme.css'), 'utf-8');;
			let cssPath:string|undefined = loadedConfiguration.get("cssPath");
			if (cssPath && fs.existsSync(cssPath)) {
				styleSheet = fs.readFileSync(cssPath).toString();
			}

			//WA to generate quotes
			html = html.replaceAll("<blockquote>", `<table><tr><th class="quote">`);
			html = html.replaceAll("</blockquote>", "</th></tr></table>");
			html = html.replaceAll("<span ", `<span style="margin:auto" `);

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


			let localResourcePath = vscode.Uri.file(path.dirname(editor.document.uri.fsPath));
			const panel = vscode.window.createWebviewPanel(
				'md2Outlook', // Identifies the type of the webview. Used internally
				path.basename(editor.document.fileName), // Title of the panel displayed to the user
				vscode.ViewColumn.One, // Editor column to show the new webview panel in.
				{
					enableScripts: true,
					localResourceRoots: [localResourcePath]
				} // Webview options. More on these later.
			  );
			
			panel.webview.html = htmlDocument;
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
}

// This method is called when your extension is deactivated
export function deactivate() {}
