var hljs = require("highlight.js"); // https://highlightjs.org
import { JSDOM } from "jsdom";
import { htmlToText } from "html-to-text";
import TurndownService from "turndown";
var turndownPluginGfm = require("turndown-plugin-gfm");

const styleRules = [
  { selectors: [".hljs-doctag", ".hljs-keyword", ".hljs-meta .hljs-keyword", ".hljs-template-tag", ".hljs-template-variable", ".hljs-type", ".hljs-variable.language_"], style: "color: #d73a49" },
  { selectors: [".hljs-title", ".hljs-title.class_", ".hljs-title.class_.inherited__", ".hljs-title.function_"], style: "color: #6f42c1" },
  { selectors: [".hljs-attr", ".hljs-attribute", ".hljs-literal", ".hljs-meta", ".hljs-number", ".hljs-operator", ".hljs-selector-attr", ".hljs-selector-class", ".hljs-selector-id", ".hljs-variable"], style: "color: #005cc5" },
  { selectors: [".hljs-meta .hljs-string", ".hljs-regexp", ".hljs-string"], style: "color: #032f62" },
  { selectors: [".hljs-built_in", ".hljs-symbol"], style: "color: #e36209" },
  { selectors: [".hljs-code", ".hljs-comment", ".hljs-formula"], style: "color: #6a737d" },
  { selectors: [".hljs-name", ".hljs-quote", ".hljs-selector-pseudo", ".hljs-selector-tag"], style: "color: #22863a" },
  { selectors: [".hljs-subst"], style: "color: #24292e" }
];

function applyInlineStyles(html: string): string {
  try {
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    for (const rule of styleRules) {
      for (const selector of rule.selectors) {
        const elements = doc.querySelectorAll(selector);
        elements.forEach((element: any) => {
          element.style.cssText += (element.style.cssText && !element.style.cssText.endsWith(";") ? ";" : "") + rule.style;
        });
      }
    }

    return doc.body.innerHTML;
  } catch (error) {
    console.error("Error applying inline styles:", error);
    return html;
  }
}

var md = require("markdown-it")({
  highlight: function (str: any, lang: any) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        const highlighted = hljs.highlight(str, { language: lang }).value;
        return applyInlineStyles(highlighted);
      } catch (__) {}
    }

    return ""; // use external default escaping
  },
}).use(require("markdown-it-mark"));

md.renderer.rules.code_inline = function (tokens: any, idx: any, options: any, env: any, self: any) {
  return `<code style="font-family:SFMono-Regular,Consolas,'Liberation Mono',Menlo,monospace;padding:0.2em 0.4em;margin:0;font-size:85%;background-color:rgba(175,184,193,0.2);border-radius:6px;color:#850000;">${md.utils.escapeHtml(tokens[idx].content)}</code>`;
};

export function renderMarkdown(text: string) {
  return md.render(text);
}

function genBorder(content: string, node: any) {
  const colspan = parseInt(node.getAttribute("colspan") || "0");
  let suffix = " " + content + " |";
  if (colspan) {
    suffix = suffix.repeat(colspan);
  }

  const index = Array.prototype.indexOf.call(node.parentNode.childNodes, node);
  let prefix = " ";
  if (index === 0) {
    prefix = "|";
  }
  return prefix + suffix;
}

function cell(content: string, node: any) {
  const colspan = parseInt(node.getAttribute("colspan") || "0");
  let suffix = "|";
  if (colspan) {
    suffix = suffix.repeat(colspan);
  }

  const index = Array.prototype.indexOf.call(node.parentNode.childNodes, node);
  let prefix = " ";
  if (index === 0) {
    prefix = "| ";
  }
  return prefix + content + " " + suffix;
}

export function htmlToMarkdown(html: string) {
  const dom = new JSDOM(html);
  const cleanedHtml = dom.window.document.body.innerHTML;

  const turndownService = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "*",
    codeBlockStyle: "fenced",
    fence: "```",
    emDelimiter: "*",
    strongDelimiter: "**",
    linkStyle: "inlined",
    linkReferenceStyle: "full",
  });

  const pandoc = [
    {
      filter: ["style", "script", "head", "meta"],
      replacement: function (content: string) {
        return "";
      },
    },
    {
      filter: "sup",
      replacement: function (content: string) {
        return "^" + content + "^";
      },
    },

    {
      filter: "sub",
      replacement: function (content: string) {
        return "~" + content + "~";
      },
    },

    {
      filter: "br",
      replacement: function () {
        return "\n";
      },
    },
    {
      filter: ["em", "i", "cite", "var"],
      replacement: function (content: string, node: any, options: any) {
        return options.emDelimiter + content + options.emDelimiter;
      },
    },

    {
      filter: function (node: any) {
        const hasSiblings = node.previousSibling || node.nextSibling;
        const isCodeBlock = node.parentNode.nodeName === "PRE" && !hasSiblings;
        const isCodeElem =
          node.nodeName === "CODE" ||
          node.nodeName === "KBD" ||
          node.nodeName === "SAMP" ||
          node.nodeName === "TT";

        return isCodeElem && !isCodeBlock;
      },
      replacement: function (content: string, node: any, options: any) {
        return "`" + content + "`";
      },
    },

    {
      filter: function (node: any) {
        return node.nodeName === "A" && node.getAttribute("href");
      },
      replacement: function (content: string, node: any, options: any) {
        const url = node.getAttribute("href");
        const titlePart = node.title ? ' "' + node.title + '"' : "";
        if (content === url) {
          return "<" + url + ">";
        } else if (url === "mailto:" + content) {
          return "<" + content + ">";
        } else if (content !== "") {
          return "[" + content + "](" + url + titlePart + ")";
        } else {
          return "";
        }
      },
    },

    {
      filter: ["font", "span"],
      replacement: function (content: string) {
        return content;
      },
    },
    {
      filter: ["div"],
      replacement: function (content: string) {
        return content + "\n";
      },
    },
    {
      filter: ["pre"],
      replacement: function (content: string) {
        return `\n\`\`\`\n${content}\n\`\`\`\n`;
      },
    },

    // table
    {
      filter: ["colgroup"],
      replacement: function (content: string) {
        return "";
      },
    },
    {
      filter: ["th", "td"],
      replacement: function (content: string, node: any) {
        return cell(content.replace(/\n/gm, ""), node);
      },
    },
    {
      filter: "tr",
      replacement: function (content: string, node: any) {
        let borderCells = "";
        const alignMap = { left: ":--", right: "--:", center: ":-:" };

        if (
          node.parentNode.nodeName === "THEAD" ||
          (node.parentNode.nodeName === "TBODY" &&
            node.parentNode.previousSibling === null &&
            node.previousSibling === null) ||
          node.previousSibling === null ||
          node.previousSibling.nodeName === "COLGROUP"
        ) {
          for (const childNode of node.childNodes) {
            const align = childNode.attributes.align;
            let border = "---";

            if (align) {
              const alignValue = align.value as keyof typeof alignMap;
              border = alignMap[alignValue] || border;
            }

            borderCells += genBorder(border, childNode);
          }
        }
        return "\n" + content + (borderCells ? "\n" + borderCells : "");
      },
    },
    {
      filter: "table",
      replacement: function (content: string) {
        return "\n\n" + content + "\n\n";
      },
    },
    {
      filter: ["thead", "tbody", "tfoot"],
      replacement: function (content: string) {
        return content;
      },
    },
  ];

  // http://pandoc.org/README.html#smart-punctuation
  const escape = function (str: string) {
    return str
      .replace(/[\u2018\u2019\u00b4]/g, "'")
      .replace(/[\u201c\u201d\u2033]/g, '"')
      .replace(/[\u2212\u2022\u00b7\u25aa]/g, "-")
      .replace(/[\u2013\u2015]/g, "--")
      .replace(/\u2014/g, "---")
      .replace(/\u2026/g, "...")
      .replace(/[ ]+\n/g, "\n")
      .replace(/\s*\\\n/g, "\\\n")
      .replace(/\s*\\\n\s*\\\n/g, "\n\n")
      .replace(/\s*\\\n\n/g, "\n\n")
      .replace(/\n-\n/g, "\n")
      .replace(/\n\n\s*\\\n/g, "\n\n")
      .replace(/\n\n\n*/g, "\n\n")
      .replace(/[ ]+$/gm, "")
      .replace(/<!--\s*([\s\S]*?)\s*-->/gm, "")
      .replace(/^\s+|[\s\\]+$/g, "");
  };
  for (const rule of pandoc) {
    turndownService.addRule(
      rule.filter.toString(),
      rule as TurndownService.Rule
    );
  }

  const markdown = turndownService.turndown(cleanedHtml);
  return markdown;
}
