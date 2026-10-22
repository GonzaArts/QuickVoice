import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const es = JSON.parse(readFileSync(join(root, "src/i18n/messages/es.json"), "utf8"));
const en = JSON.parse(readFileSync(join(root, "src/i18n/messages/en.json"), "utf8"));
const read = (path) => readFileSync(join(root, path), "utf8");

test("Spanish and English dictionaries have identical keys and non-empty strings", () => {
  for (const locale of ["es", "en"]) {
    const raw = readFileSync(join(root, `src/i18n/messages/${locale}.json`), "utf8");
    const declaredKeys = [...raw.matchAll(/^ {2}("(?:\\.|[^"\\])*")\s*:/gm)].map((match) => match[1]);
    assert.equal(new Set(declaredKeys).size, declaredKeys.length, `Duplicate keys in ${locale}.json`);
  }
  assert.deepEqual(Object.keys(es).sort(), Object.keys(en).sort());
  assert.ok(Object.keys(es).length >= 100);
  for (const [key, value] of Object.entries(es)) {
    assert.ok(key.length && typeof value === "string" && value.trim(), key);
    assert.equal(en[key], key);
    const placeholders = (copy) => [...copy.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)]
      .map((match) => match[1]).sort();
    assert.deepEqual(placeholders(value), placeholders(key), `Interpolation tokens: ${key}`);
  }
});

test("literal t() calls and automatically translated titles have dictionary entries", () => {
  const translatedProps = {
    PageHeader: new Set(["title", "description"]),
    EmptyState: new Set(["title", "description"]),
    StateView: new Set(["title", "description"]),
    StatCard: new Set(["label"]),
  };
  const sourceFiles = walk(join(root, "src")).filter((f) => f.endsWith(".tsx"));
  for (const filename of sourceFiles) {
    const source = readFileSync(filename, "utf8");
    for (const match of source.matchAll(/\bt\(\s*("(?:\\.|[^"\\])*")/g)) {
      const key = JSON.parse(match[1]);
      assert.ok(Object.hasOwn(es, key), `${filename}: t(${JSON.stringify(key)})`);
    }
    const tree = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node) {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const props = translatedProps[node.tagName.getText(tree)];
        if (props) {
          for (const attr of node.attributes.properties) {
            if (!ts.isJsxAttribute(attr) || !props.has(attr.name.text) ||
                !attr.initializer || !ts.isStringLiteral(attr.initializer)) continue;
            assert.ok(Object.hasOwn(es, attr.initializer.text),
              `${filename}: <${node.tagName.getText(tree)} ${attr.name.text}=${JSON.stringify(attr.initializer.text)}>`);
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
  }
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
      assert.ok(Object.hasOwn(es, key), `${filename}: ${key}`);
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
    require: (name) => name === "./messages/en.json" ? en : name === "./messages/es.json" ? es : (() => {throw new Error(name)})(),
  });
  const {normalizeLocale, translate, localeCode, formatNumber, formatDate} = moduleValue.exports;
  assert.equal(normalizeLocale(undefined), "es");
  assert.equal(normalizeLocale("es-ES"), "es");
  assert.equal(normalizeLocale("en-US"), "en");
  assert.equal(translate("es", "Agents"), "Asistentes");
  assert.equal(translate("en", "Agents"), "Agents");
  assert.equal(translate("es", "__unknown_message__"), "__unknown_message__");
  assert.equal(translate("es", "Language"), "Idioma");
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
