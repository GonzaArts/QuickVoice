import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { inspect, inspectSource } from "../scripts/i18n-audit.mjs";

const analyze = (source, filename = "fixture.tsx") => inspectSource(source, { filename });

test("rejects raw API status and direction labels while preserving enum comparisons", () => {
  const result = analyze(`function Call(){return <>
    <span>{call.status.toLowerCase().replace("_", " ")}</span>
    <span>{call.direction ?? "—"}</span>
    <span>{call.direction === "inbound" ? t("Inbound") : t("Outbound")}</span>
  </>;}`);
  assert.equal(result.properties.filter(item => item.sink === "raw enum label").length, 2);
});

test("checks source copy stored in preview events and error state against catalogs", () => {
  const result = analyze(`function Preview(){
    addEvent("Session", "Temporary room created.");
    setError(error instanceof Error ? error.message : "Could not start preview.");
    return <p>{t(event.detail)}</p>;
  }`);
  for (const key of ["Session", "Temporary room created.", "Could not start preview."]) {
    assert.ok(result.missingKeys.some(item => item.key === key));
  }
});

test("finds mapped literal labels and error state aliases at presentation sinks", () => {
  const result = analyze(`function View() {
    const [error, setError] = useState(null);
    const msg = apiError.message || "Request failed";
    toast.error(msg);
    return <><p>{error}</p>{["Call outcomes", "Direction mix"].map(title => <h3>{title}</h3>)}</>;
  }`);
  assert.ok(result.expressions.some(item => item.key === "Call outcomes"));
  assert.ok(result.expressions.some(item => item.key === "Direction mix"));
  assert.ok(result.apiErrors.some(item => item.key === "error"));
  assert.ok(result.apiErrors.some(item => item.key === "msg"));
});

test("recognizes local prop translators without hiding untranslated sibling props", () => {
  const result = analyze(`
    function Field({label, description}) { return <p>{t(label)}{description}</p>; }
    function Section({title}) { return <h2><Trans>{title}</Trans></h2>; }
    function Forwarder({label}) { return <Field label={label}/>; }
    export function Page() { return <><Field label="Known label" description="Raw description"/><Section title="Section title"/><Forwarder label="Forwarded label"/></>; }
  `);
  assert.equal(result.attributes.find(item => item.key === "Known label").auto, true);
  assert.equal(result.attributes.find(item => item.key === "Raw description").auto, false);
  assert.equal(result.attributes.find(item => item.key === "Section title").auto, true);
  assert.equal(result.attributes.find(item => item.key === "Forwarded label").auto, true);
  assert.ok(result.missingKeys.some(item => item.key === "Known label"));
  assert.ok(result.missingKeys.some(item => item.key === "Section title"));
});

test("inspects standalone TypeScript fixtures and visible JSX strings", () => {
  const result = analyze(`
    export const schema = z.object({ email: z.string().min(1, "Email is required") });
    export const constants = { title: "Account settings", code: "INTERNAL_AGENT" };
    export function Page() { return <section title={"Team members"}>Hello there</section>; }
  `);
  assert.deepEqual(result.texts.map((item) => item.key), ["Hello there"]);
  assert.deepEqual(result.attributes.map((item) => item.key), ["Team members"]);
  assert.deepEqual(result.properties.map((item) => item.key), ["Email is required", "Account settings"]);
});

test("finds untranslated calls, template copy, native options and wrapped attribute strings", () => {
  const result = analyze(`
    const label = t("Organization name");
    const title = <PageHeader title={"Billing overview"} />;
    const body = <p>{\`No calls found for \${users}\`}</p>;
    const choices = <select><option>Choose a region</option></select>;
    const settings = { placeholder: "Search users", description: "Manage workspace access" };
    const ok = translateUi("Saved successfully");
  `);
  assert.ok(result.missingKeys.some((item) => item.key === "Organization name"));
  assert.ok(result.attributes.some((item) => item.key === "Billing overview"));
  assert.ok(result.expressions.some((item) => item.key === "No calls found for {value}"));
  assert.ok(!result.expressions.some((item) => item.key === null));
  assert.ok(result.texts.some((item) => item.key === "Choose a region"));
  assert.ok(result.properties.some((item) => item.key === "Manage workspace access"));
  assert.ok(result.missingKeys.some((item) => item.key === "Saved successfully"));
});

test("inspects conditional JSX attribute strings and respects auto-translating state props", () => {
  const result = analyze(`
    export function Page({ canManageNumbers, hasError }) {
      return <>
        <EmptyState description={canManageNumbers ? "Buy a number from your telephony provider to start routing calls." : "Ask an administrator to manage phone numbers."} />
        <PageHeader title={hasError ? "Could not load numbers" : "Phone numbers"} />
        <ErrorState title="Could not load this view" description="Try again in a moment." />
        <StateView title="No matches" description="Adjust your filters." />
        <StatCard label="Calls today" />
        <input placeholder={hasError ? "Could not load numbers" : "Phone numbers"} />
      </>;
    }
  `);
  assert.deepEqual(result.attributes.map((item) => item.key), [
    "Buy a number from your telephony provider to start routing calls.",
    "Ask an administrator to manage phone numbers.",
    "Could not load numbers",
    "Phone numbers",
    "Could not load this view",
    "Try again in a moment.",
    "No matches",
    "Adjust your filters.",
    "Calls today",
    "Could not load numbers",
    "Phone numbers",
  ]);
  assert.deepEqual(result.attributes.filter((item) => item.auto).map((item) => item.key), [
    "Buy a number from your telephony provider to start routing calls.",
    "Ask an administrator to manage phone numbers.",
    "Could not load numbers",
    "Phone numbers",
    "Could not load this view",
    "Try again in a moment.",
    "No matches",
    "Adjust your filters.",
    "Calls today",
  ]);
  assert.deepEqual(result.missingKeys.map((item) => item.key), result.attributes.filter((item) => item.auto).map((item) => item.key));
});

test("follows local conditional labels rendered by a component", () => {
  const result = analyze(`
    export function Page({ connected }) {
      const connectionLabel = connected ? "Connected" : "Not connected";
      return <span>{connectionLabel}</span>;
    }
  `);
  assert.deepEqual(result.expressions.map((item) => item.key), ["Connected", "Not connected"]);
});

test("stops cyclic local binding resolution and tolerates an empty JSX expression", () => {
  const cyclic = analyze(`
    export function Page() {
      const first = second;
      const second = first;
      return <p>{first}</p>;
    }
  `);
  assert.deepEqual(cyclic.expressions, []);
  assert.doesNotThrow(() => analyze(`<input title={} />`));
});

test("ignores dynamic masks and formatting while keeping dynamic interface copy", () => {
  const result = analyze(`
    export function Page({ token, count, name }) {
      return <><p>{\`${"${token}"}••••••••\`}</p><p>{\`(${"${count}"})\`}</p><p>{\`Agent: ${"${name}"}\`}</p></>;
    }
  `);
  assert.deepEqual(result.expressions.map((item) => item.key), ["Agent: {value}"]);
});

test("reports raw API errors shown to users while ignoring internal error codes", () => {
  const result = analyze(`
    toast.error(error.message || "Could not save changes");
    return <p>{apiError.message}</p>;
    localizeError(t, otherError.message);
    const code = "RESOURCE_NOT_FOUND";
  `);
  assert.ok(result.apiErrors.length >= 1);
  assert.ok(result.toasts.some((item) => item.key === "Could not save changes"));
  assert.ok(!result.apiErrors.some((item) => item.key === "otherError.message"));
  assert.ok(!result.texts.some((item) => item.key === "RESOURCE_NOT_FOUND"));
});

test("checks translated JSX keys and translate(locale, key) against both locale catalogs", () => {
  const result = inspectSource(`<><Trans>{"Known message"}</Trans><Trans>Missing message</Trans></>\ntranslate("es", "Known message");\ntranslate("es", "Missing function message");`, {
    filename: "fixture.tsx",
    knownKeys: new Set(["Known message"]),
  });
  assert.deepEqual(result.missingKeys.map((item) => item.key), ["Missing message", "Missing function message"]);
});

test("keeps catalogued object labels review-required until their render path is verified", () => {
  const result = inspectSource(`
    const schema = z.string().min(1, "Known message");
    const options = [{ label: "Known label" }];
    export function Page() { return <>{options.map((option) => <p>{option.label}</p>)}</>; }
  `, { filename: "fixture.tsx", knownKeys: new Set(["Known message", "Known label"]) });
  assert.ok(result.propertyReview.some((item) => item.key === "Known label"));
  assert.ok(result.properties.some((item) => item.key === "Known label" && item.sink === "raw JSX property access"));
  assert.ok(!result.propertyReview.some((item) => item.key === "Known message"));
  assert.ok(!result.properties.some((item) => item.key === "Known message"));
});

test("does not report an object label translated at its JSX sink", () => {
  const result = inspectSource(`
    const options = [{ label: "Known label" }];
    export function Page() { return <>{options.map((option) => <p>{t(option.label)}</p>)}</>; }
  `, { filename: "fixture.tsx", knownKeys: new Set(["Known label"]) });
  assert.ok(!result.properties.some((item) => item.sink === "raw JSX property access"));
});

test("supports the backward-compatible repository scan and explicit roots", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "i18n-audit-"));
  let result;
  try {
    fs.writeFileSync(path.join(root, "fixture.tsx"), "export const View = () => <p>Visible fixture text</p>;");
    result = inspect({ root });
    assert.ok(result.texts.some((item) => item.key === "Visible fixture text"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  for (const category of ["texts", "attributes", "expressions", "toasts", "properties", "propertyReview", "missingKeys", "apiErrors"]) {
    assert.ok(Array.isArray(result[category]), `missing ${category}`);
  }
});

test("fails clearly when a locale catalog contains malformed JSON", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "i18n-audit-json-"));
  const localeDir = path.join(root, "messages");
  fs.mkdirSync(localeDir);
  fs.writeFileSync(path.join(localeDir, "en.json"), "{ broken");
  try {
    assert.throws(() => inspect({ root, localeDir }), /Cannot parse i18n catalog/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
