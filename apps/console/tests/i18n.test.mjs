import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { inspect } from "../scripts/i18n-audit.mjs";

const root = resolve(import.meta.dirname, "..");
const es = JSON.parse(readFileSync(join(root, "src/i18n/messages/es.json"), "utf8"));
const en = JSON.parse(readFileSync(join(root, "src/i18n/messages/en.json"), "utf8"));
const extraEs = JSON.parse(readFileSync(join(root, "src/i18n/messages/extended.es.json"), "utf8"));
const extraEn = JSON.parse(readFileSync(join(root, "src/i18n/messages/extended.en.json"), "utf8"));
const fullEs = { ...es, ...extraEs };
const fullEn = { ...en, ...extraEn };
const read = (path) => readFileSync(join(root, path), "utf8");

test("Spanish and English dictionaries have identical keys and non-empty strings", () => {
  for (const locale of ["es", "en"]) {
    const raw = readFileSync(join(root, `src/i18n/messages/${locale}.json`), "utf8");
    const declaredKeys = [...raw.matchAll(/^ {2}("(?:\\.|[^"\\])*")\s*:/gm)].map((match) => match[1]);
    assert.equal(new Set(declaredKeys).size, declaredKeys.length, `Duplicate keys in ${locale}.json`);
  }
  for (const locale of ["es", "en"]) {
  const raw = read(`src/i18n/messages/extended.${locale}.json`);
  const keys = [...raw.matchAll(/^ {2}("(?:\\.|[^"\\])*")\s*:/gm)].map(match => match[1]);
  assert.equal(new Set(keys).size, keys.length, `Duplicate supplemental keys: ${locale}`);
  }
  const extraRaw = readFileSync(join(root, "src/i18n/messages/extended.es.json"), "utf8");
  const extraDeclaredKeys = [...extraRaw.matchAll(/^ {2}("(?:\\.|[^"\\])*")\s*:/gm)]
    .map((match) => match[1]);
  assert.equal(new Set(extraDeclaredKeys).size, extraDeclaredKeys.length,
    "Duplicate keys in extended.es.json");
  assert.deepEqual(Object.keys(es).sort(), Object.keys(en).sort());
  assert.deepEqual(Object.keys(fullEs).sort(), Object.keys(fullEn).sort());
  for (const [key, value] of Object.entries(fullEn)) assert.equal(value, key);
  assert.ok(Object.keys(es).length >= 100);
  for (const [key, value] of Object.entries(es)) {
    assert.ok(key.length && typeof value === "string" && value.trim(), key);
    assert.equal(en[key], key);
    const placeholders = (copy) => [...copy.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)]
      .map((match) => match[1]).sort();
    assert.deepEqual(placeholders(value), placeholders(key), `Interpolation tokens: ${key}`);
  }
  assert.equal(Object.keys(extraEs).length, new Set(Object.keys(extraEs)).size);
  for (const [key, value] of Object.entries(extraEs)) {
    assert.ok(!Object.hasOwn(es, key), `Supplemental key duplicates base dictionary: ${key}`);
    assert.ok(key.length && typeof value === "string" && value.trim(), key);
    const placeholders = (copy) => [...copy.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)]
      .map((match) => match[1]).sort();
    assert.deepEqual(placeholders(value), placeholders(key), `Interpolation tokens: ${key}`);
  }
});

test("literal translation calls and automatically translated titles have dictionary entries", () => {
  const translatedProps = {
    PageHeader: new Set(["title", "description"]),
    EmptyState: new Set(["title", "description"]),
    StateView: new Set(["title", "description"]),
    StatCard: new Set(["label"]),
  };
  const sourceFiles = walk(join(root, "src")).filter((f) => f.endsWith(".tsx") ||
    f.endsWith(".ts"));
  for (const filename of sourceFiles) {
    const source = readFileSync(filename, "utf8");
    for (const match of source.matchAll(/\bt\(\s*("(?:\\.|[^"\\])*")/g)) {
      const key = JSON.parse(match[1]);
      assert.ok(Object.hasOwn(fullEs, key), `${filename}: t(${JSON.stringify(key)})`);
    }
    const tree = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true,
      filename.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    function visit(node) {
      if (ts.isCallExpression(node) &&
          (node.expression.getText(tree) === "t" || node.expression.getText(tree) === "translateUi") &&
          node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) {
        const key = node.arguments[0].text;
        assert.ok(Object.hasOwn(fullEs, key),
          `${filename}: ${node.expression.getText(tree)}(${JSON.stringify(key)})`);
      }
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const props = translatedProps[node.tagName.getText(tree)];
        if (props) {
          for (const attr of node.attributes.properties) {
            if (!ts.isJsxAttribute(attr) || !props.has(attr.name.text) ||
                !attr.initializer || !ts.isStringLiteral(attr.initializer)) continue;
            assert.ok(Object.hasOwn(fullEs, attr.initializer.text),
              `${filename}: <${node.tagName.getText(tree)} ${attr.name.text}=${JSON.stringify(attr.initializer.text)}>`);
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
  }
});

test("visible UI copy and first-party notifications remain localized", () => {
  const { texts, attributes, expressions, toasts, properties, missingKeys, apiErrors } = inspect();
  const summary = (items) => items.map(({ filename, key }) =>
    `${filename.replace(root, "")}: ${key}`);
  assert.deepEqual(summary(texts), [], "Untranslated visible JSX text");
  assert.deepEqual(summary(expressions), [], "Untranslated conditional JSX text");
  assert.deepEqual(summary(toasts), [], "Untranslated notification message");
  assert.deepEqual(summary(properties), [], "Untranslated configuration or column labels");
  assert.deepEqual(summary(missingKeys), [], "Missing translation keys");
  assert.deepEqual(summary(apiErrors), [], "Raw API error messages shown to users");
  const unlocalizedAttributes = attributes.filter((item) =>
    item.client && !item.auto &&
    !/^(?:[\w.-]+@[\w.-]+|[a-z_]+(?:\d+)?|https?:\/\/\S+)$/.test(item.key)
  );
  assert.deepEqual(summary(unlocalizedAttributes), [], "Untranslated placeholder or accessibility label");
});

test("localization is limited to the console and does not touch voice/call configuration", () => {
  assert.match(read("src/app/layout.tsx"), /I18nProvider/);
  assert.match(read("src/components/shell/Topbar.tsx"), /LanguageSwitcher/);
  assert.match(read("src/i18n/config.ts"), /qv_locale/);
  assert.match(read("src/i18n/config.ts"), /es-ES/);
});

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]
  );
}

test("all literal Trans children have Spanish translations", () => {
  const sourceFiles = walk(join(root, "src")).filter((f) => f.endsWith(".tsx"));
  for (const filename of sourceFiles) {
    const source = readFileSync(filename, "utf8");
    for (const match of source.matchAll(/<Trans>\{("(?:\\.|[^"\\])*")\}<\/Trans>/g)) {
      const key = JSON.parse(match[1]);
      assert.ok(Object.hasOwn(fullEs, key), `${filename}: ${key}`);
    }
  }
});


test("native select options contain text, not translation components", () => {
  const sourceFiles = walk(join(root, "src")).filter((f) => f.endsWith(".tsx"));
  for (const filename of sourceFiles) {
    const source = readFileSync(filename, "utf8");
    assert.doesNotMatch(source, /<option[^>]*>\s*<Trans\b/, filename);
  }
});

test("i18n helper executes with Spanish default, English override and safe fallback", () => {
  const source = read("src/i18n/config.ts");
  const code = ts.transpileModule(source, {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true},
  }).outputText;
  const moduleValue = {exports: {}};
  vm.runInNewContext(code, {
    exports: moduleValue.exports,
    module: moduleValue,
    Intl,
    require: (name) => name === "./messages/en.json" ? en : name === "./messages/es.json" ? es :
      name === "./messages/extended.es.json" ? extraEs : name === "./messages/extended.en.json" ? extraEn : (() => {throw new Error(name)})(),
  });
  const {normalizeLocale, translate, localeCode, formatNumber, formatDate} = moduleValue.exports;
  assert.equal(normalizeLocale(undefined), "es");
  assert.equal(normalizeLocale("es-ES"), "es");
  assert.equal(normalizeLocale("en-US"), "en");
  assert.equal(translate("es", "Agents"), "Agentes");
  assert.equal(translate("en", "Agents"), "Agents");
  assert.equal(translate("es", "__unknown_message__"), "__unknown_message__");
  assert.equal(translate("es", "Language"), "Idioma");
  assert.equal(translate("es", "Traffic timeline"), "Evolución del tráfico");
  assert.equal(translate("en", "Traffic timeline"), "Traffic timeline");
  assert.equal(localeCode("es"), "es-ES");
  assert.equal(formatNumber("es", 12345.5), "12.345,5");
  assert.ok(typeof formatDate("es", new Date("2026-10-22T10:00:00Z")) === "string");
});

test("all console TSX files parse without syntax diagnostics", () => {
  const sourceFiles = walk(join(root, "src")).filter((f) => f.endsWith(".tsx"));
  for (const filename of sourceFiles) {
    const source = ts.createSourceFile(filename, readFileSync(filename, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    assert.deepEqual(
      source.parseDiagnostics.map((problem) => problem.messageText),
      [],
      filename,
    );
  }
});
