// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import path = require('path');
import * as vscode from 'vscode';
import * as fs from 'fs';


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
		line-height:10px;
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
        padding-left: 10px;
		border-left: 1px solid #03a9f4;
		border-collapse: collapse;
		border-left-width: medium;
        background-color: #f4f4f4;
	  }

	`;

	const MERMAID_STYLESHEET = `
:root {
  --default-font: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Microsoft YaHei Light", sans-serif;
  --font-monospace: 'Source Code Pro', monospace;
  --background-primary: #ffffff;
  --background-modifier-border: #ddd;
  --text-accent: #705dcf;
  --text-accent-hover: #7a6ae6;
  --text-normal: #2e3338;
  --background-secondary: #f2f3f5;
  --background-secondary-alt: #e3e5e8;
  --text-muted: #888888;
  --font-mermaid: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Microsoft YaHei Light", sans-serif;
  --text-error: #E4374B;
  --background-primary-alt: '#fafafa';
  --background-accent: '';
  --interactive-accent: hsl( 254,  80%, calc( 68% + 2.5%));
  --background-modifier-error: #E4374B;
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

function copyData(){
	console.log('Hello World!');

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
	navigator.clipboard.write([data]);
	console.log('Copied document to clipboard');
}

window.onload = copyData();
	
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
			
			console.log(htmlDocument);
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
}

// This method is called when your extension is deactivated
export function deactivate() {}
