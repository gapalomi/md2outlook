import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import * as fs from 'fs';

export async function replaceVsCodeLinksToGithub() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    const document = editor.document;
    const text = document.getText();
    const regex = /\[(.*?)\]\(vscode:\/\/file\/(.*?)\)/g;
    let match;
    const replacements: { range: vscode.Range, newText: string }[] = [];

    // Collect all matches first
    const matches = [];
    while ((match = regex.exec(text)) !== null) {
        matches.push({
            fullMatch: match[0],
            linkText: match[1],
            filePathWithLine: match[2],
            index: match.index,
            length: match[0].length
        });
    }

    if (matches.length === 0) {
        vscode.window.showInformationMessage("No vscode links found.");
        return;
    }

    // Group by repository root to ask for SHA once per repo (or globally if preferred)
    // For now, let's just process each link. To optimize, we could cache repo info.
    
    // We'll ask for SHA once for simplicity as per request "the extension should also ask the sha"
    const shaInput = await vscode.window.showInputBox({
        prompt: "Enter commit SHA (leave empty for HEAD)",
        placeHolder: "HEAD"
    });
    const sha = shaInput || "HEAD";

    for (const m of matches) {
        const parts = m.filePathWithLine.split(':');
        // vscode://file/path/to/file:line:col or :line
        // The regex captures "path/to/file:line:col"
        
        // We need to separate path from line numbers.
        // Windows paths might have drive letter "c:/..."
        // Let's assume the last parts are line/col if they are numbers.
        
        let filePath = m.filePathWithLine;
        let line = "";
        
        // Check for line number at the end
        const lineMatch = filePath.match(/(.*):(\d+)(:\d+)?$/);
        if (lineMatch) {
            filePath = lineMatch[1];
            line = lineMatch[2];
        }

        // Use VS Code URI parsing to handle encoding and path normalization
        try {
            // Ensure we have a valid URI string. 
            // If filePath starts with a drive letter, prepend / to make it /x:/... which is standard for file URI path
            let uriPath = filePath;
            if (/^[a-zA-Z]:/.test(filePath)) {
                uriPath = '/' + filePath;
            }
            // Handle potential double slashes if the regex captured them
            uriPath = uriPath.replace(/^\/+/, '/');
            
            const uri = vscode.Uri.parse(`file://${uriPath}`);
            filePath = uri.fsPath;
        } catch (e) {
            console.warn(`Failed to parse URI for ${filePath}: ${e}`);
            // Fallback to simple decode
            filePath = decodeURIComponent(filePath);
        }

        // Verify file exists locally to run git commands
        if (!fs.existsSync(filePath)) {
            console.warn(`File not found: ${filePath}. Removing link, keeping label.`);
            const startPos = document.positionAt(m.index);
            const endPos = document.positionAt(m.index + m.length);
            replacements.push({
                range: new vscode.Range(startPos, endPos),
                newText: m.linkText
            });
            continue;
        }

        const repoRoot = await getGitRepoRoot(filePath);
        if (!repoRoot) {
            console.warn(`Not a git repo: ${filePath}`);
            continue;
        }

        const remoteUrl = await getGitRemoteUrl(repoRoot);
        if (!remoteUrl) {
            console.warn(`No remote url: ${repoRoot}`);
            continue;
        }

        // Convert remote URL to https github format if it's SSH or other
        // git@github.com:user/repo.git -> https://github.com/user/repo
        let githubUrl = remoteUrl.replace(/\.git$/, '');
        if (githubUrl.startsWith('git@')) {
            githubUrl = githubUrl.replace(':', '/').replace('git@', 'https://');
        }

        // Get relative path
        const relativePath = path.relative(repoRoot, filePath).replace(/\\/g, '/');

        // Construct new URL
        // https://github.com/<user>/<repo>/blob/<sha>/<path>#L<line>
        let newUrl = `${githubUrl}/blob/${sha}/${relativePath}`;
        if (line) {
            newUrl += `#L${line}`;
        }

        const newText = `[${m.linkText}](${newUrl})`;
        
        const startPos = document.positionAt(m.index);
        const endPos = document.positionAt(m.index + m.length);
        replacements.push({
            range: new vscode.Range(startPos, endPos),
            newText: newText
        });
    }

    // Apply edits in reverse order to not mess up indices, or use workspace edit
    if (replacements.length > 0) {
        await editor.edit(editBuilder => {
            // Apply in reverse order
            for (let i = replacements.length - 1; i >= 0; i--) {
                editBuilder.replace(replacements[i].range, replacements[i].newText);
            }
        });
        vscode.window.showInformationMessage(`Replaced ${replacements.length} links.`);
    }
}

function getGitRepoRoot(filePath: string): Promise<string | null> {
    return new Promise((resolve) => {
        const dir = path.dirname(filePath);
        // Use -C to avoid issues with UNC paths in cmd.exe
        exec(`git -C "${dir}" rev-parse --show-toplevel`, (error, stdout) => {
            if (error) {
                console.warn(`git rev-parse failed for ${dir}: ${error.message}`);
                resolve(null);
                return;
            }
            resolve(stdout.trim());
        });
    });
}

function getGitRemoteUrl(repoDir: string): Promise<string | null> {
    return new Promise((resolve) => {
        // Use -C here as well
        exec(`git -C "${repoDir}" config --get remote.origin.url`, (error, stdout) => {
            if (error) {
                console.warn(`git config failed for ${repoDir}: ${error.message}`);
                resolve(null);
                return;
            }
            resolve(stdout.trim());
        });
    });
}
