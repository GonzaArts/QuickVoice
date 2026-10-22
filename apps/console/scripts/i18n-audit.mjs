#!/usr/bin/env node
/**
 * Find untranslated, literal interface copy in console TSX.
 *
 * Only presentation strings are inspected: API fields, sample prompts, external
 * catalog content, and identifiers must not be translated automatically.
 *
 * Usage: node scripts/i18n-audit.mjs [--attributes|--expressions|--toasts|--fix-text|--fix-expressions|--fix-attributes|--fix-toasts]
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "../src");
const exclusions = new Set([
  "Trans", "code", "pre", "script", "style", "option", "svg", "text", "title",
]);
const literals = new Set([
  "ID", "API", "GET", "POST", "PUT", "PATCH", "DELETE", "URL", "URI", "JSON", "CSV", "PDF", "XML",
  "MCP", "HTTP", "HTTPS", "SIP", "Twilio", "Telnyx", "QuickVoice", "GitHub", "OpenAI", "AWS",
  "OpenAPI", "OAuth", "OAuth2", "Bearer", "Bearer token", "x-api-key", "x-organization-id", "LiveKit",
  "English", "Español", "TypeScript", "JavaScript", "Python", "Node.js", "0", "1", "2", "3",
  "email", "mcp", "system", "agent", "tools", "provider", "source", "headers", "metadata", "input",
]);
const translatedProps = {
  PageHeader: new Set(["title", "description"]),
  EmptyState: new Set(["title", "description"]),
  StateView: new Set(["title", "description"]),
  StatCard: new Set(["label"]),
};

function htmlUnescape(s) {
  return s.replace(/&(apos|quot|amp|lt|gt|nbsp|#39|#34);/g, (match, entity) => ({
    apos: "'", quot: '"', amp: "&", lt: "<", gt: ">", nbsp: " ", "#39": "'", "#34": '"',
  })[entity] ?? match);
}

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(dir, entry.name);
    return entry.isDirectory() ? files(filename) :
      filename.endsWith(".tsx") || (filename.endsWith(".ts") && filename.includes("/hooks/queries/"))
        ? [filename] : [];
  });
}

function isExcluded(node) {
  let current = node.parent;
  while (current) {
    if ((ts.isJsxElement(current) && exclusions.has(current.openingElement.tagName.getText())) ||
        (ts.isJsxSelfClosingElement(current) && exclusions.has(current.tagName.getText()))) return true;
    current = current.parent;
  }
  return false;
}

function isHumanText(key) {
  return /[a-zA-Z]{2}/.test(key) && !literals.has(key) &&
    !/^(?:[A-Z0-9_-]{2,}|https?:\/\/\S+|[a-z]+\.[a-z]+)$/.test(key);
}

function componentOwner(node) {
  let parent = node.parent;
  while (parent) {
    if (ts.isFunctionDeclaration(parent) && /^(?:[A-Z]|use[A-Z])/.test(parent.name?.text ?? "") &&
        parent.body) return parent;
    if ((ts.isArrowFunction(parent) || ts.isFunctionExpression(parent)) &&
        ts.isVariableDeclaration(parent.parent) &&
        /^(?:[A-Z]|use[A-Z])/.test(parent.parent.name.getText()) &&
        ts.isBlock(parent.body)) return parent;
    parent = parent.parent;
  }
  return null;
}

export function inspect() {
  const texts = [], attributes = [], expressions = [], toasts = [];
  for (const filename of files(root)) {
    const src = fs.readFileSync(filename, "utf8");
    const scriptKind = filename.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const sf = ts.createSourceFile(filename, src, ts.ScriptTarget.Latest, true, scriptKind);
    function visit(node) {
      if (ts.isJsxText(node) && !isExcluded(node)) {
        const raw = node.getText(sf);
        const key = htmlUnescape(raw.replace(/\s+/g, " ").trim());
        if (isHumanText(key)) texts.push({ filename, key, raw, start: node.getStart(sf), end: node.end });
      }
      if (ts.isJsxExpression(node) && node.expression && ts.isJsxElement(node.parent) &&
          !isExcluded(node) && node.parent.openingElement.tagName.getText(sf) !== "Trans") {
        function inspectExpression(expression) {
          if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
            const key = expression.text;
            if (isHumanText(key)) expressions.push({
              filename, key, start: expression.getStart(sf), end: expression.end,
            });
          } else if (ts.isConditionalExpression(expression)) {
            inspectExpression(expression.whenTrue);
            inspectExpression(expression.whenFalse);
          } else if (ts.isBinaryExpression(expression) && ["&&", "||", "??"].includes(expression.operatorToken.getText(sf))) {
            // The left side is often a guard or enum comparison: never
            // translate values that control application behavior.
            inspectExpression(expression.right);
          } else if (ts.isParenthesizedExpression(expression)) {
            inspectExpression(expression.expression);
          }
        }
        inspectExpression(node.expression);
      }
      if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer) &&
        ["placeholder", "title", "aria-label", "aria-description", "alt"].includes(node.name.text)) {
        const key = node.initializer.text;
        const tag = node.parent.parent?.tagName?.getText(sf) ?? "";
        const owner = componentOwner(node);
        if (isHumanText(key)) attributes.push({filename, key, name: node.name.text,
          tag, owner, auto: translatedProps[tag]?.has(node.name.text) ?? false,
          client: /^\s*["']use client["'];?/.test(src),
          start: node.getStart(sf), end: node.end});
      }
      if (ts.isCallExpression(node) &&
          /^toast\.(?:success|error|info|warning|message|loading)$/.test(node.expression.getText(sf))) {
        function inspectToastArg(expression) {
          if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
            if (isHumanText(expression.text)) toasts.push({
              filename, key: expression.text,
              owner: componentOwner(node),
              client: /^\s*["']use client["'];?/.test(src),
              start: expression.getStart(sf), end: expression.end,
            });
          } else if (ts.isConditionalExpression(expression)) {
            inspectToastArg(expression.whenTrue);
            inspectToastArg(expression.whenFalse);
          } else if (ts.isBinaryExpression(expression) && ["??", "||"].includes(expression.operatorToken.getText(sf))) {
            inspectToastArg(expression.right);
          } else if (ts.isParenthesizedExpression(expression)) {
            inspectToastArg(expression.expression);
          }
        }
        for (const arg of node.arguments) inspectToastArg(arg);
      }
      ts.forEachChild(node, visit);
    }
    visit(sf);
  }
  return { texts, attributes, expressions, toasts };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const { texts, attributes, expressions, toasts } = inspect();
  const kind = process.argv.includes("--attributes") ? "attributes" :
    process.argv.includes("--expressions") ? "expressions" :
    process.argv.includes("--toasts") ? "toasts" : "texts";
  const items = kind === "attributes" ? attributes : kind === "expressions" ? expressions :
    kind === "toasts" ? toasts : texts;
  if (process.argv.includes("--fix-text") || process.argv.includes("--fix-expressions") ||
      process.argv.includes("--fix-attributes") || process.argv.includes("--fix-toasts")) {
    const fixAttributes = process.argv.includes("--fix-attributes");
    const fixToasts = process.argv.includes("--fix-toasts");
    const fixExpressions = process.argv.includes("--fix-expressions");
    const fixes = fixToasts ? toasts.filter((item) => item.client && item.owner) : fixAttributes
      ? attributes.filter((item) => item.client && item.owner && !item.auto &&
        !/^(?:[\w.-]+@[\w.-]+|[a-z_]+(?:\d+)?|https?:\/\/\S+)$/.test(item.key))
      : fixExpressions ? expressions : texts;
    for (const filename of new Set(fixes.map((item) => item.filename))) {
      if (filename.endsWith("LanguageSwitcher.tsx")) continue;
      let content = fs.readFileSync(filename, "utf8");
      const affected = fixes.filter((item) => item.filename === filename).sort((a, b) => b.start - a.start);
      for (const item of affected) {
        if (fixAttributes || fixToasts) {
          if (fixToasts) {
            content = content.slice(0, item.start) + "translateUi(" + JSON.stringify(item.key) + ")" +
              content.slice(item.end);
            continue;
          }
          const attr = content.slice(item.start, item.end);
          const old = JSON.stringify(item.key);
          content = content.slice(0, item.start) +
            attr.replace("=" + old, "={translateUi(" + old + ")}") + content.slice(item.end);
          continue;
        }
        if (fixExpressions) {
          content = content.slice(0, item.start) +
            `<Trans>{${JSON.stringify(item.key)}}</Trans>` + content.slice(item.end);
          continue;
        }
        const match = item.raw.match(/^(\s*)([\s\S]*?)(\s*)$/);
        if (!match) continue;
        const [, before, , after] = match;
        content = content.slice(0, item.start) + `${before}<Trans>{${JSON.stringify(item.key)}}</Trans>${after}` + content.slice(item.end);
      }
      if (!fixAttributes && !fixToasts && !content.includes('import { Trans } from "@/src/i18n/Trans";')) {
        const directive = content.match(/^(?:\s*)["']use client["'];?\r?\n/)?.[0] ?? "";
        content = content.replace(directive, `${directive}\nimport { Trans } from "@/src/i18n/Trans";\n`);
      }
      if (fixAttributes || fixToasts) {
        const reparsed = ts.createSourceFile(filename, content, ts.ScriptTarget.Latest, true,
          filename.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
        const anchors = new Set();
        function visit(node) {
          if (ts.isCallExpression(node) && node.expression.getText(reparsed) === "translateUi") {
            const owner = componentOwner(node);
            if (owner?.body && ts.isBlock(owner.body)) {
              const alreadyDeclared = owner.body.statements.some((statement) =>
                ts.isVariableStatement(statement) && statement.declarationList.declarations.some(
                  (declaration) => declaration.name.getText(reparsed) === "translateUi"
                ));
              if (!alreadyDeclared) anchors.add(owner.body.getStart(reparsed) + 1);
            }
          }
          ts.forEachChild(node, visit);
        }
        visit(reparsed);
        for (const pos of [...anchors].sort((a, b) => b - a)) {
          content = content.slice(0, pos) + "\n  const translateUi = useT();" + content.slice(pos);
        }
        if (!/import\s*\{[^}]*\buseT\b[^}]*\}\s*from\s*["']@\/src\/i18n\/provider["']/.test(content)) {
          const directive = content.match(/^(?:\s*)["']use client["'];?\r?\n/)?.[0] ?? "";
          content = content.replace(directive, directive + '\nimport { useT } from "@/src/i18n/provider";\n');
        }
      }
      fs.writeFileSync(filename, content);
    }
    console.log(`Wrapped ${fixes.length} English UI ${fixExpressions ? "expression" : "text"} nodes`);
  } else {
    console.log(`${kind}: ${items.length}, unique: ${new Set(items.map((item) => item.key)).size}`);
    for (const item of items) {
      console.log(`${path.relative(root, item.filename)}\t${item.name ?? "text"}\t${item.tag ?? ""}\t${item.key}`);
    }
  }
}
