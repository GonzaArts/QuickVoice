#!/usr/bin/env node
/**
 * Find untranslated, literal interface copy in console TypeScript and TSX.
 *
 * Only presentation strings are inspected: API fields, sample prompts, external
 * catalog content, and identifiers must not be translated automatically.
 *
 * Usage: node scripts/i18n-audit.mjs [--attributes|--expressions|--toasts|--properties|--missing-keys|--api-errors]
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const defaultRoot = path.resolve(import.meta.dirname, "../src");
const exclusions = new Set([
  "Trans", "code", "pre", "script", "style", "svg",
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
  DynamicVariableInputs: new Set(["title", "description"]),
  WebhookSecretFieldEditor: new Set(["label", "description", "keyPlaceholder"]),
  ParamEditor: new Set(["label", "hint"]),
};
for (const component of ["ErrorState", "LoadingState", "PermissionState", "OfflineState", "WarningState", "ApiErrorState"]) {
  translatedProps[component] = new Set(["title", "description"]);
}
const presentationProperties = new Set(["label", "title", "description", "message", "placeholder"]);
const ignoredDirectories = new Set(["node_modules", ".next", ".turbo", "dist", "build", "generated"]);

function htmlUnescape(s) {
  return s.replace(/&(apos|quot|amp|lt|gt|nbsp|#39|#34);/g, (match, entity) => ({
    apos: "'", quot: '"', amp: "&", lt: "<", gt: ">", nbsp: " ", "#39": "'", "#34": '"',
  })[entity] ?? match);
}

function files(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(dir, entry.name);
    if (entry.isDirectory()) return ignoredDirectories.has(entry.name) ? [] : files(filename);
    return /\.tsx?$/.test(filename) && !/\.d\.ts$/.test(filename) ? [filename] : [];
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
  if (typeof key !== "string") return false;
  const visibleWords = key.replace(/\{[a-zA-Z][a-zA-Z0-9_]*\}/g, " ").replace(/[^\p{L}]+/gu, " ").trim();
  return /\p{L}{2}/u.test(visibleWords) && !/^(?:ID|API|URL|URI|MCP|HTTP|HTTPS)$/i.test(visibleWords) && !literals.has(key) &&
    !/^\s*https?:\/\/\S+(?:\s+https?:\/\/\S+)+\s*$/.test(key) &&
    !/^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(key) &&
    !/^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/.test(key) &&
    !/\b(?:organization|user|resource) ID\b/i.test(key) &&
    !/^(?:[A-Z0-9_-]{2,}|https?:\/\/\S+|[a-z]+\.[a-z]+)$/.test(key);
}

function templateCopy(expression) {
  if (ts.isStringLiteral(expression)) return expression.text;
  if (ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text;
  if (!ts.isTemplateExpression(expression)) return null;
  return expression.templateSpans.reduce((copy, span) => `${copy}{value}${span.literal.text}`, expression.head.text);
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

const resultShape = () => ({ texts: [], attributes: [], expressions: [], toasts: [], properties: [], propertyReview: [], missingKeys: [], apiErrors: [] });
const stringNode = (node) => Boolean(node) && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node));
const isTranslationCall = (node) => ts.isCallExpression(node) &&
  /^(?:t|translateUi|translate|Trans)$/.test(node.expression.getText());

function collectTranslationCalls(sf, filename, result, knownKeys) {
  function visit(node) {
    if (ts.isCallExpression(node) && /^(?:addEvent|setError|setActionError|setAssignmentError|setConversionError|setReportError|setPreflightError)$/.test(node.expression.getText(sf))) {
      function inspectCopy(expression) {
        if (stringNode(expression) && isHumanText(expression.text)) {
          result.missingKeys.push({ filename, key: expression.text, missing: !knownKeys.has(expression.text),
            start: expression.getStart(sf), end: expression.end });
        } else if (ts.isConditionalExpression(expression)) {
          inspectCopy(expression.whenTrue);
          inspectCopy(expression.whenFalse);
        } else if (ts.isBinaryExpression(expression) && ["||", "??"].includes(expression.operatorToken.getText(sf))) {
          inspectCopy(expression.right);
        }
      }
      node.arguments.forEach(inspectCopy);
    }
    const jsxTrans = ts.isJsxElement(node) && node.openingElement.tagName.getText(sf) === "Trans";
    const helperFallback = ts.isCallExpression(node) && /^(?:localizeError|localizeValidationMessage)$/.test(node.expression.getText(sf));
    if (isTranslationCall(node) || jsxTrans || helperFallback) {
      const first = helperFallback ? node.arguments.at(-1) : ts.isCallExpression(node)
        ? node.arguments[node.expression.getText(sf) === "translate" ? 1 : 0] : node.children.find((child) =>
        ts.isJsxExpression(child) && child.expression && stringNode(child.expression))?.expression ?? node.children.find(ts.isJsxText);
      const key = first && ts.isJsxText(first) ? htmlUnescape(first.text.replace(/\s+/g, " ").trim()) : first?.text;
      if (first && (stringNode(first) || ts.isJsxText(first)) && isHumanText(key)) {
        const item = { filename, key, start: first.getStart(sf), end: first.end };
        result.missingKeys.push({ ...item, missing: !knownKeys.has(item.key) });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
}

// Infer prop translation for helpers declared in this file. Checking each prop
// independently avoids exempting a raw description just because its label is translated.
function localPropTranslators(sf) {
  const components = new Map();
  function visit(node) {
    const name = ts.isFunctionDeclaration(node) ? node.name?.text :
      ts.isVariableDeclaration(node) && node.initializer &&
        (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)) ? node.name.getText(sf) : undefined;
    const fn = ts.isVariableDeclaration(node) ? node.initializer : node;
    if (name && /^[A-Z]/.test(name) && fn?.parameters?.[0] &&
        ts.isObjectBindingPattern(fn.parameters[0].name) && fn.body) {
      const params = new Map(fn.parameters[0].name.elements.map(element =>
        [element.name.getText(sf), element.propertyName?.getText(sf) ?? element.name.getText(sf)]));
      const translated = new Set();
      const raw = new Set();
      function inspect(child) {
        if (ts.isJsxExpression(child) && child.expression) {
          const expression = child.expression;
          const tag = ts.isJsxElement(child.parent) ? child.parent.openingElement.tagName.getText(sf) : "";
          if (tag === "Trans" && ts.isIdentifier(expression) && params.has(expression.text)) {
            translated.add(params.get(expression.text));
          } else if (ts.isCallExpression(expression) && /^(?:t|translateUi)$/.test(expression.expression.getText(sf)) &&
              ts.isIdentifier(expression.arguments[0]) && params.has(expression.arguments[0].text)) {
            translated.add(params.get(expression.arguments[0].text));
          } else if (ts.isIdentifier(expression) && params.has(expression.text)) {
            const attr = child.parent;
            const tag = ts.isJsxAttribute(attr) ? attr.parent.parent.tagName?.getText(sf) : undefined;
            const forwarded = tag && ((translatedProps[tag]?.has(attr.name.text) ?? false) ||
              (components.get(tag)?.has(attr.name.text) ?? false));
            (forwarded ? translated : raw).add(params.get(expression.text));
          }
        }
        ts.forEachChild(child, inspect);
      }
      inspect(fn.body);
      components.set(name, new Set([...translated].filter(prop => !raw.has(prop))));
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return components;
}

export function inspectSource(source, { filename = "fixture.tsx", knownKeys = new Set() } = {}) {
  const result = resultShape();
  const { texts, attributes, expressions, toasts, properties, apiErrors } = result;
  const src = source;
  {
    const scriptKind = filename.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const sf = ts.createSourceFile(filename, src, ts.ScriptTarget.Latest, true, scriptKind);
    const localTranslatedProps = localPropTranslators(sf);
    const bindings = new Map();
    const catalogBindings = new Map();
    const parameterCatalogBindings = new Map();
    const bindingScope = (node) => componentOwner(node);
    function mappedLiteralValues(node, identifier) {
      let parent = node.parent;
      while (parent) {
        if (ts.isArrowFunction(parent) && parent.parameters[0]?.name.getText(sf) === identifier &&
            ts.isCallExpression(parent.parent) && ts.isPropertyAccessExpression(parent.parent.expression) &&
            parent.parent.expression.name.text === "map") {
          const source = parent.parent.expression.expression;
          if (ts.isArrayLiteralExpression(source)) return source.elements.filter(stringNode);
        }
        parent = parent.parent;
      }
      return [];
    }
    function rawErrorAlias(expression, owner, seen = new Set()) {
      if (!expression) return false;
      if (ts.isCallExpression(expression) && /^(?:localizeError|localizeValidationMessage|t|translateUi)$/.test(expression.expression.getText(sf))) return false;
      if (ts.isPropertyAccessExpression(expression) && expression.name.text === "message") return true;
      if (ts.isIdentifier(expression) && !seen.has(expression.text)) {
        seen.add(expression.text);
        return rawErrorAlias(bindings.get(owner)?.get(expression.text), owner, seen);
      }
      let unsafe = false;
      ts.forEachChild(expression, child => { if (rawErrorAlias(child, owner, seen)) unsafe = true; });
      return unsafe;
    }
    function literalPresentationProperties(value) {
      const found = new Map();
      function find(node) {
        if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) &&
            presentationProperties.has(node.name.text) && stringNode(node.initializer) && isHumanText(node.initializer.text)) {
          const values = found.get(node.name.text) ?? [];
          values.push(node.initializer);
          found.set(node.name.text, values);
        }
        ts.forEachChild(node, find);
      }
      find(value);
      return found;
    }
    function rememberBinding(node) {
      if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || !node.initializer) return;
      const scope = bindingScope(node);
      let scoped = bindings.get(scope);
      if (!scoped) bindings.set(scope, scoped = new Map());
      scoped.set(node.name.text, node.initializer);
      const properties = literalPresentationProperties(node.initializer);
      if (properties.size) {
        let candidates = catalogBindings.get(scope);
        if (!candidates) catalogBindings.set(scope, candidates = new Map());
        candidates.set(node.name.text, properties);
      }
    }
    function attributeTextLiterals(expression, scope, seen = new Set()) {
      if (!expression) return [];
      if (stringNode(expression) || ts.isTemplateExpression(expression)) return [templateCopy(expression)];
      if (ts.isConditionalExpression(expression)) return [
        ...attributeTextLiterals(expression.whenTrue, scope, seen),
        ...attributeTextLiterals(expression.whenFalse, scope, seen),
      ];
      if (ts.isBinaryExpression(expression) && ["&&", "||", "??"].includes(expression.operatorToken.getText(sf))) {
        return attributeTextLiterals(expression.right, scope, seen);
      }
      if (ts.isParenthesizedExpression(expression)) return attributeTextLiterals(expression.expression, scope, seen);
      if (ts.isIdentifier(expression) && !seen.has(expression.text)) {
        seen.add(expression.text);
        const initializer = bindings.get(scope)?.get(expression.text) ?? bindings.get(null)?.get(expression.text);
        return initializer ? attributeTextLiterals(initializer, scope, seen) : [];
      }
      return [];
    }
    function visit(node) {
      rememberBinding(node);
      if (ts.isArrowFunction(node) && ts.isCallExpression(node.parent) &&
          ts.isPropertyAccessExpression(node.parent.expression) && node.parent.expression.name.text === "map" &&
          ts.isIdentifier(node.parent.expression.expression) && ts.isIdentifier(node.parameters[0]?.name)) {
        const scope = componentOwner(node);
        const source = catalogBindings.get(scope)?.get(node.parent.expression.expression.text) ??
          catalogBindings.get(null)?.get(node.parent.expression.expression.text);
        if (source) {
          let params = parameterCatalogBindings.get(scope);
          if (!params) parameterCatalogBindings.set(scope, params = new Map());
          params.set(node.parameters[0].name.text, source);
        }
      }
      if (ts.isJsxText(node) && !isExcluded(node)) {
        const raw = node.getText(sf);
        const key = htmlUnescape(raw.replace(/\s+/g, " ").trim());
        if (isHumanText(key)) texts.push({ filename, key, raw, start: node.getStart(sf), end: node.end });
      }
      if (ts.isJsxExpression(node) && node.expression && ts.isJsxElement(node.parent) &&
          !isExcluded(node) && node.parent.openingElement.tagName.getText(sf) !== "Trans") {
        function inspectEnumLabel(expression) {
          if (ts.isPropertyAccessExpression(expression) && ["status", "direction"].includes(expression.name.text)) {
            properties.push({ filename, key: expression.getText(sf), name: expression.name.text,
              catalogued: false, actionableSink: true, sink: "raw enum label", start: expression.getStart(sf), end: expression.end });
          } else if (ts.isCallExpression(expression) && ts.isPropertyAccessExpression(expression.expression) &&
              /^(?:toLowerCase|toUpperCase|replace|replaceAll)$/.test(expression.expression.name.text)) {
            inspectEnumLabel(expression.expression.expression);
          } else if (ts.isConditionalExpression(expression)) {
            inspectEnumLabel(expression.whenTrue);
            inspectEnumLabel(expression.whenFalse);
          } else if (ts.isBinaryExpression(expression) && ["??", "||"].includes(expression.operatorToken.getText(sf))) {
            inspectEnumLabel(expression.left);
            inspectEnumLabel(expression.right);
          }
        }
        inspectEnumLabel(node.expression);
        function inspectExpression(expression, seen = new Set()) {
          if (stringNode(expression) || ts.isTemplateExpression(expression)) {
            const key = templateCopy(expression);
            if (isHumanText(key)) expressions.push({
              filename, key, start: expression.getStart(sf), end: expression.end,
            });
          } else if (ts.isConditionalExpression(expression)) {
            inspectExpression(expression.whenTrue, seen);
            inspectExpression(expression.whenFalse, seen);
          } else if (ts.isBinaryExpression(expression) && ["&&", "||", "??"].includes(expression.operatorToken.getText(sf))) {
            // The left side is often a guard or enum comparison: never
            // translate values that control application behavior.
            inspectExpression(expression.right, seen);
          } else if (ts.isParenthesizedExpression(expression)) {
            inspectExpression(expression.expression, seen);
          } else if (ts.isIdentifier(expression) && !seen.has(expression.text)) {
            seen.add(expression.text);
            const owner = componentOwner(node);
            const initializer = bindings.get(owner)?.get(expression.text) ?? bindings.get(null)?.get(expression.text);
            if (initializer) inspectExpression(initializer, seen);
            for (const value of mappedLiteralValues(node, expression.text)) inspectExpression(value, seen);
            if (/^(?:error|actionError|assignmentError|conversionError|reportError)$/i.test(expression.text) || rawErrorAlias(expression, owner)) {
              apiErrors.push({ filename, key: expression.text, start: expression.getStart(sf), end: expression.end });
            }
          }
        }
        inspectExpression(node.expression);
      }
      if (ts.isJsxAttribute(node) && node.initializer &&
        ["placeholder", "title", "description", "message", "label", "aria-label", "aria-description", "alt"].includes(node.name.text)) {
        const value = ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer;
        const tag = node.parent.parent?.tagName?.getText(sf) ?? "";
        const owner = componentOwner(node);
        for (const key of attributeTextLiterals(value, owner)) {
          if (isHumanText(key)) {
            const auto = (translatedProps[tag]?.has(node.name.text) ?? false) ||
              (localTranslatedProps.get(tag)?.has(node.name.text) ?? false);
            const item = {filename, key, name: node.name.text,
              tag, owner, auto,
              client: /^\s*["']use client["'];?/.test(src),
              start: node.getStart(sf), end: node.end};
            attributes.push(item);
            if (auto) result.missingKeys.push({ ...item, missing: !knownKeys.has(key), sink: "auto-translated component prop" });
          }
        }
      }
      if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) &&
          presentationProperties.has(node.name.text) && stringNode(node.initializer) && isHumanText(node.initializer.text) &&
          !/[/\\]lib[/\\]data[/\\]voices\.ts$/i.test(filename)) {
        properties.push({ filename, key: node.initializer.text, name: node.name.text,
          catalogued: knownKeys.has(node.initializer.text), start: node.initializer.getStart(sf), end: node.initializer.end });
      }
      if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) &&
          presentationProperties.has(node.name.text) && !isExcluded(node)) {
        let jsxExpression = node.parent;
        while (jsxExpression && !ts.isJsxExpression(jsxExpression)) jsxExpression = jsxExpression.parent;
        const rendered = jsxExpression?.expression;
        const wrapped = rendered && ts.isCallExpression(rendered) &&
          /^(?:t|translateUi|translate)$/.test(rendered.expression.getText(sf));
        const attribute = jsxExpression?.parent;
        const propTag = attribute && ts.isJsxAttribute(attribute)
          ? attribute.parent.parent.tagName?.getText(sf) : undefined;
        const autoProp = propTag && ((translatedProps[propTag]?.has(attribute.name.text) ?? false) ||
          (localTranslatedProps.get(propTag)?.has(attribute.name.text) ?? false));
        if (jsxExpression && !wrapped && !autoProp) {
          const scope = componentOwner(node);
          const declaration = catalogBindings.get(scope)?.get(node.expression.text)?.get(node.name.text) ??
            catalogBindings.get(null)?.get(node.expression.text)?.get(node.name.text) ??
            parameterCatalogBindings.get(scope)?.get(node.expression.text)?.get(node.name.text);
          for (const literal of declaration ?? []) properties.push({
            filename, key: literal.text, name: `${node.name.text} access`, catalogued: knownKeys.has(literal.text),
            sink: "raw JSX property access", actionableSink: true, start: node.getStart(sf), end: node.end,
          });
        }
      }
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
          /^(?:min|max|email|url|regex|length|refine|superRefine|nonempty|required)$/.test(node.expression.name.text)) {
        const message = node.arguments[1] && ts.isObjectLiteralExpression(node.arguments[1])
          ? node.arguments[1].properties.find((property) => ts.isPropertyAssignment(property) &&
            ts.isIdentifier(property.name) && property.name.text === "message")?.initializer
          : node.arguments[1] && stringNode(node.arguments[1]) ? node.arguments[1] : node.arguments[0];
        if (message && stringNode(message) && isHumanText(message.text)) properties.push({
          filename, key: message.text, name: "validation message", catalogued: knownKeys.has(message.text),
          autoHandled: knownKeys.has(message.text),
          start: message.getStart(sf), end: message.end,
        });
      }
      if (ts.isPropertyAccessExpression(node) && node.name.text === "message" &&
          /(?:error|err|apiError|failure)/i.test(node.expression.getText(sf))) {
        let parent = node.parent;
        while (parent && !ts.isJsxExpression(parent) && !ts.isCallExpression(parent)) parent = parent.parent;
        if (parent && ts.isCallExpression(parent) && /^(?:localizeError|localizeValidationMessage)$/.test(parent.expression.getText(sf))) {
          ts.forEachChild(node, visit);
          return;
        }
        const jsxSink = parent && ts.isJsxExpression(parent) && ts.isJsxElement(parent.parent) ?
          parent.parent.openingElement.tagName.getText(sf) : "";
        if (parent && ((ts.isJsxExpression(parent) && jsxSink !== "FormMessage") ||
            (ts.isCallExpression(parent) && /^toast\./.test(parent.expression.getText(sf))))) {
          apiErrors.push({ filename, key: node.getText(sf), start: node.getStart(sf), end: node.end });
        }
      }
      if (ts.isCallExpression(node) &&
          /^toast\.(?:success|error|info|warning|message|loading)$/.test(node.expression.getText(sf))) {
        for (const argument of node.arguments) {
          if (ts.isIdentifier(argument) && rawErrorAlias(argument, componentOwner(node))) {
            apiErrors.push({ filename, key: argument.text, start: argument.getStart(sf), end: argument.end });
          }
        }
        function inspectToastArg(expression) {
          if (stringNode(expression) || ts.isTemplateExpression(expression)) {
            const key = templateCopy(expression);
            if (isHumanText(key)) toasts.push({
              filename, key,
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
    collectTranslationCalls(sf, filename, result, knownKeys);
  }
  result.missingKeys = result.missingKeys.filter((item) => item.missing);
  result.properties = [...new Map(result.properties.map((item) =>
    [`${item.filename}:${item.start}:${item.end}`, item])).values()];
  result.propertyReview = result.properties.filter((item) => item.catalogued && !item.autoHandled && !item.actionableSink).map((item) => ({
    ...item, status: "catalogued; verify its render path translates the value",
  }));
  result.properties = result.properties.filter((item) => item.actionableSink || !item.catalogued || item.autoHandled === false);
  return result;
}

export function inspect(options = {}) {
  const root = path.resolve(options.root ?? defaultRoot);
  const localeDir = options.localeDir ?? path.resolve(defaultRoot, "i18n/messages");
  const knownKeys = new Set();
  const localeKeys = { en: new Set(), es: new Set() };
  for (const [name, locale] of [["en.json", "en"], ["extended.en.json", "en"], ["es.json", "es"], ["extended.es.json", "es"]]) {
    const file = path.join(localeDir, name);
    if (fs.existsSync(file)) {
      try {
        Object.keys(JSON.parse(fs.readFileSync(file, "utf8"))).forEach((key) => localeKeys[locale].add(key));
      } catch (error) {
        throw new Error(`Cannot parse i18n catalog ${file}`, { cause: error });
      }
    }
  }
  for (const key of localeKeys.en) if (localeKeys.es.has(key)) knownKeys.add(key);
  const result = resultShape();
  for (const filename of files(root)) {
    const found = inspectSource(fs.readFileSync(filename, "utf8"), { filename, knownKeys });
    for (const key of Object.keys(result)) result[key].push(...found[key]);
  }
  result.missingKeys = result.missingKeys.filter((item) => item.missing);
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const result = inspect({ root: process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : undefined });
  const reviewProperties = process.argv.includes("--review-properties");
  const requested = ["texts", "attributes", "expressions", "toasts", "properties", "propertyReview", "missingKeys", "apiErrors"]
    .find((kind) => process.argv.includes(`--${kind.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`));
  const categories = requested ? [requested] : Object.keys(result).filter((category) => category !== "propertyReview" || reviewProperties);
  const findings = categories.flatMap((category) => result[category]
    .filter((item) => !(category === "attributes" && item.auto))
    .map((item) => ({ category, ...item })));
  console.log(`${findings.length} actionable i18n findings across ${categories.join(", ")}`);
  if (!reviewProperties && !requested) console.log(`${result.propertyReview.length} catalogued property literals remain informational until their render paths are confirmed`);
  for (const item of findings) {
    console.log(`${item.category}\t${path.relative(defaultRoot, item.filename)}\t${item.name ?? ""}\t${item.key}`);
  }
  if (findings.length) process.exitCode = 1;
}
