import TurndownService from "turndown";
import { renderMarkdown } from "./markdown";

export function markdownToConfluence(markdown: string): string {
    const html = renderMarkdown(markdown);
    const service = new TurndownService({
        headingStyle: "atx",
        hr: "----",
        bulletListMarker: "*",
        codeBlockStyle: "fenced",
        emDelimiter: "_",
    });

    service.escape = function (str) {
        return str
            .replace(/\\/g, '\\\\')
            .replace(/\*/g, '\\*')
            .replace(/_/g, '\\_')
            .replace(/\{/g, '\\{')
            .replace(/\}/g, '\\}')
            .replace(/\|/g, '\\|')
            .replace(/\!/g, '\\!');
    };

    // Strong
    service.addRule('strong', {
        filter: ['strong', 'b'],
        replacement: function (content) {
            return `*${content}*`;
        }
    });

    // Headings
    service.addRule('headings', {
        filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
        replacement: function (content, node) {
            const hLevel = Number(node.nodeName.charAt(1));
            return `h${hLevel}. ${content}\n\n`;
        }
    });

    // Links
    service.addRule('links', {
        filter: 'a',
        replacement: function (content, node) {
            const element = node as HTMLElement;
            const href = element.getAttribute('href');
            return `[${content}|${href}]`;
        }
    });

    // Images
    service.addRule('images', {
        filter: 'img',
        replacement: function (content, node) {
            const element = node as HTMLElement;
            const src = element.getAttribute('src');
            return `!${src}!`;
        }
    });

    // Code blocks
    service.addRule('codeBlock', {
        filter: 'pre',
        replacement: function (content, node) {
            let language = '';
            const element = node as HTMLElement;
            const code = element.querySelector('code');
            if (code) {
                const className = code.className || '';
                const match = className.match(/language-(\w+)/);
                if (match) {
                    language = match[1];
                }
            }
            const langParam = language ? `:${language}` : '';
            return `{code${langParam}}\n${content}\n{code}\n\n`;
        }
    });
    
    // Inline code
    service.addRule('inlineCode', {
        filter: 'code',
        replacement: function (content, node) {
             if (node.parentNode && node.parentNode.nodeName === 'PRE') {
                 return content;
             }
             return `{{${content}}}`;
        }
    });

    // Blockquote
    service.addRule('blockquote', {
        filter: 'blockquote',
        replacement: function (content) {
            return `{quote}\n${content}\n{quote}\n\n`;
        }
    });

    // Tables
    service.addRule('table', {
        filter: 'table',
        replacement: function (content, node) {
            return content + '\n\n';
        }
    });

    service.addRule('tableSection', {
        filter: ['thead', 'tbody', 'tfoot'],
        replacement: function (content) {
            return content;
        }
    });
    
    service.addRule('tableRow', {
        filter: 'tr',
        replacement: function (content, node) {
            let closing = '|';
            const element = node as HTMLElement;
            if (element.querySelector('th')) {
                closing = '||';
            }
            return content + closing + '\n';
        }
    });
    
    service.addRule('tableHeader', {
        filter: 'th',
        replacement: function (content, node) {
            return `||${content}`;
        }
    });
    
    service.addRule('tableCell', {
        filter: 'td',
        replacement: function (content, node) {
            return `|${content}`;
        }
    });

    // Lists
    service.addRule('listItem', {
        filter: 'li',
        replacement: function (content, node, options) {
            content = content
                .replace(/^\n+/, '') // remove leading newlines
                .replace(/\n+$/, '\n') // replace trailing newlines with single newline
                .replace(/\n/gm, '\n'); // normalize newlines
            return content + '\n';
        }
    });

    service.addRule('unorderedList', {
        filter: 'ul',
        replacement: function (content, node) {
            const lines = content.split('\n');
            const processed = lines.map(line => {
                if (line.trim() === '') {
                    return '';
                }
                // Check if line is already a list item (nested)
                if (line.match(/^[*#]+\s/)) {
                    return '*' + line;
                }
                return '* ' + line;
            }).filter(l => l !== '');
            return '\n' + processed.join('\n') + '\n\n';
        }
    });

    service.addRule('orderedList', {
        filter: 'ol',
        replacement: function (content, node) {
            const lines = content.split('\n');
            const processed = lines.map(line => {
                if (line.trim() === '') {
                    return '';
                }
                if (line.match(/^[*#]+\s/)) {
                    return '#' + line;
                }
                return '# ' + line;
            }).filter(l => l !== '');
            return '\n' + processed.join('\n') + '\n\n';
        }
    });

    return service.turndown(html);
}
