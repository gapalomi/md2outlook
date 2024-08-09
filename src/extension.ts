// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import path = require('path');
import * as vscode from 'vscode';
import * as fs from 'fs';
import { API as GitAPI, GitExtension, APIState, Remote } from './git'; 


const DEFAULT_STYLESHEET =/*html*/
	`
	table {
		border-collapse: collapse;
	}
	
	
	thead tr {
		background-color: #009879;
		color: #000000;
		text-align: left;
		border-bottom: 2px solid #009879;
	}
	
	 th, td {
		background:#ffffff;
		padding:0in 5.4pt 0in 5.4pt
	}
	
	 td:nth-of-type(even) {
		background-color: #f3f3f3;
	}
	
	
	
	
	body{
		-ms-text-size-adjust: 100%;
		-webkit-text-size-adjust: 100%;
		color: #333;
		font-family: Calibri;
		font-size: 14.5px;
		line-height: 1.6;
		word-wrap: break-word;
	}
	
	mark{
		background-color: yellow;
	}
	
	blockquote{
		background-color: rgb(245, 245, 220);
		padding: 20px;
		border-left-style: solid;
		border-left-color: rgb(88, 171, 249);
		border-left-width: thick;
	}
	
	pre{
		border: 40px solid #ffffff;
		mso-add-space:auto;
		mso-line-height-alt:7.5pt;
		background-color: #f4f4f4;
		color: black;
		margin: 15px;
		padding: 10px;
	}
	
	code{
		font-family: Consolas;
		color: darkred;
		font-size: 13px;
	
	}
	
	pre code{
		
		mso-add-space:auto;
		-ms-text-size-adjust: 100%;
		-webkit-text-size-adjust: 100%;
		color: rgb(0, 0, 0);
		mso-line-height-rule:exactly;
		line-height:20px;
		-ms-text-size-adjust: 100%;
		
	}
	
	
	  
	  /*!
		Theme: GitHub
		Description: Light theme as seen on github.com
		Author: github.com
		Maintainer: @Hirse
		Updated: 2021-05-15
	  
		Outdated base version: https://github.com/primer/github-syntax-light
		Current colors taken from GitHub's CSS
	  */
	  .hljs {
		color: #24292e;
		background: #fff
	  }
	  
	  .hljs-doctag,
	  .hljs-keyword,
	  .hljs-meta .hljs-keyword,
	  .hljs-template-tag,
	  .hljs-template-variable,
	  .hljs-type,
	  .hljs-variable.language_ {
		color: #d73a49
	  }
	  
	  .hljs-title,
	  .hljs-title.class_,
	  .hljs-title.class_.inherited__,
	  .hljs-title.function_ {
		color: #6f42c1
	  }
	  
	  .hljs-attr,
	  .hljs-attribute,
	  .hljs-literal,
	  .hljs-meta,
	  .hljs-number,
	  .hljs-operator,
	  .hljs-selector-attr,
	  .hljs-selector-class,
	  .hljs-selector-id,
	  .hljs-variable {
		color: #005cc5
	  }
	  
	  .hljs-meta .hljs-string,
	  .hljs-regexp,
	  .hljs-string {
		color: #032f62
	  }
	  
	  .hljs-built_in,
	  .hljs-symbol {
		color: #e36209
	  }
	  
	  .hljs-code,
	  .hljs-comment,
	  .hljs-formula {
		color: #6a737d
	  }
	  
	  .hljs-name,
	  .hljs-quote,
	  .hljs-selector-pseudo,
	  .hljs-selector-tag {
		color: #22863a
	  }
	  
	  .hljs-subst {
		color: #24292e
	  }
	  
	  .hljs-section {
		color: #005cc5;
		font-weight: 700
	  }
	  
	  .hljs-bullet {
		color: #735c0f
	  }
	  
	  .hljs-emphasis {
		color: #24292e;
		font-style: italic
	  }
	  
	  .hljs-strong {
		color: #24292e;
		font-weight: 700
	  }
	  
	  .hljs-addition {
		color: #22863a;
		background-color: #f0fff4
	  }
	  
	  .hljs-deletion {
		color: #b31d28;
		background-color: #ffeef0
	  }	
	
	  .quote {
		font-family: Calibri;
		font-style: italic;
		font-weight: normal;
		color: black;
	
		border-left: 5px solid #03a9f4;
		border-collapse: collapse;
		border-left-width: thick;
		background-color: #f4f4f4;
		text-align: left;
	  }
	
	`;


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

const htmlTemplate = (stylesheet: string, body: string, title: string) => `<html>
<head>
  <title>${title}</title>
  <style>
    ${stylesheet}
  </style>
</head>
<body>
${body}
</body>
<script>

// Constants for retry mechanism
const maxRetries = 100;
const retryDelay = 100; // Delay in milliseconds

async function  attemptCopy(retries = 0) {
    try {
        await copyData();
        console.log('Copy successful');
    } catch (error) {
        if (retries < maxRetries) {
            setTimeout(() => {
                console.log('Retry #' + retries + 1);
                attemptCopy(retries + 1);
            }, retryDelay);
        } else {
            console.error('Failed to copy data after maximum retries:', error);
            // Optionally, handle the maximum retry failure
        }
    }
}

async function copyData(){

	var html = document.getElementsByTagName('html')[0].innerHTML;	

	const data =
	new ClipboardItem({
		"text/html": new Blob([html], {
			// @ts-ignore
			type: ["text/html", 'text/plain']
		}),
		"text/plain": new Blob([html], {
			type: "text/plain"
		}),
	});

	let result = await navigator.clipboard.write([data]);
	console.log("RESULT " + result)
}

window.onload = attemptCopy();
	
</script>
</html>`;

var loadedConfiguration: vscode.WorkspaceConfiguration;
function updateConfiguration() {
	vscode.workspace.getConfiguration('md2outlook');
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

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

			// Replace urls if required
			// let urslSetupString:string[] = loadedConfiguration.get("urlTranslate") as string[];
			// let urls = urslSetupString.map((x)=>{return x.split(",");});
			// const mdLinkRegex = /\[(.*?)\]\((.*):(\d+)\)/gi;
			// let match;
			// while ((match = mdLinkRegex.exec(text)) !== null) {
			// 	const [, linkText, filePath, lineNumber] = match;
			// 	const link = {
			// 		linkText,
			// 		filePath,
			// 		lineNumber: parseInt(lineNumber),
			// 	};
			// }

            let html = md.render(text);

			let styleSheet = DEFAULT_STYLESHEET;
			let cssPath:string|undefined = loadedConfiguration.get("cssPath");
			if (cssPath && fs.existsSync(cssPath)) {
				styleSheet = fs.readFileSync(cssPath).toString();
			}

			//WA to generate quotes
			html = html.replaceAll("<blockquote>", `<table><tr><th class="quote">`);
			html = html.replaceAll("</blockquote>", "</th></tr></table>");
			html = html.replaceAll("<span ", `<span style="margin:auto" `);


			const htmlDocument = htmlTemplate(styleSheet, html, editor.document.fileName);
			
			
			const panel = vscode.window.createWebviewPanel(
				'md2Outlook', // Identifies the type of the webview. Used internally
				path.basename(editor.document.fileName), // Title of the panel displayed to the user
				vscode.ViewColumn.One, // Editor column to show the new webview panel in.
				{
					enableScripts: true
				} // Webview options. More on these later.
			  );
			
			panel.webview.html = htmlDocument;
			vscode.window.showInformationMessage("Copied to Clipboard 📋");
            
        }
		
	});

	context.subscriptions.push(disposable);

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
