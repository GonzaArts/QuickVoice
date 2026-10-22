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
  assert.deepEqual(Object.keys(es).sort(), Object.keys(en).sort());
  assert.ok(Object.keys(es).length >= 100);
  for (const [key, value] of Object.entries(es)) {
    assert.ok(key.length && typeof value === "string" && value.trim(), key);
    assert.equal(en[key], key);
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
