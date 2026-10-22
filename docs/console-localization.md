# QuickVoice console localization (fork)

The customer console uses English source messages as stable lookup keys with native `es` and `en` dictionaries under `apps/console/src/i18n/messages/`. Only interface copy is translated; user-entered prompts, caller transcripts, tools, model IDs, API payloads and business data remain unmodified.

- Default locale: Spanish (`es-ES`).
- English: select `English` from the language picker in the console header.
- Preference: first-party `qv_locale` cookie, one year, SameSite=Lax, per browser. No database migration.
- SSR: `apps/console/src/app/layout.tsx` reads the cookie to set `html lang`, avoiding hydration differences.
- Client strings: use `useT()("English source message")`, or `<Trans>{"English source message"}</Trans>` for static JSX copy.
- Placeholders: `t("Hello, {name}", {name})` supports interpolation without translating user content.
- Formats: `formatNumber(locale, value)`, `formatDate(locale, value)`; timestamps continue to use canonical values in APIs.
- Unknown messages fall back to their original English text, never to an empty string.
- The original `en.json` and `es.json` stay in parity. The complete audit adds
  Spanish entries in `extended.es.json`; English uses the untranslated source
  key as the canonical fallback for those additions. Do not duplicate a key
  between `es.json` and `extended.es.json`.
- Static option labels, chart legends, status labels, and toast messages also
  use translations. Only presentation copy is localized; API values and
  executable business rules must remain the original canonical values.
- The `node apps/console/tests/i18n.test.mjs` suite rejects missing keys,
  interpolation mismatches, and regressions where new literal JSX/notification
  copy is added without translation.
- No new runtime dependencies, changes to agent-provider settings or database changes. This fork deliberately avoids adding `next-intl` to the pinned workspace dependency lockfile.

## Validation

GitHub Actions must be enabled for the fork before merging the PR. The pull request is not a passing build merely because it has no checks; run the complete console CI job and visually inspect both locales before merge.

The audit checks statically authored, first-party presentation strings. Content
supplied by providers (including third-party errors), users, or APIs is not
automatically translated: translating an agent prompt, model name, generated
transcript, remote catalog description, or call metadata could change the
meaning of data. Dynamic server-supplied messages should be localized at their
origin if needed, not through a UI-wide string replacement.

To inspect untranslated static copy, run the nonmutating scanner:

```sh
node apps/console/scripts/i18n-audit.mjs
node apps/console/scripts/i18n-audit.mjs --attributes
node apps/console/scripts/i18n-audit.mjs --expressions
node apps/console/scripts/i18n-audit.mjs --toasts
```

The scanner is intentionally conservative: it flags interface-like text for
review, and skips known technical keys or input examples. Any `--fix-*` mode
modifies source code and requires a reviewer to ensure no protocol string,
identifier or user-authored content was wrapped by mistake.


From the repository root run `node --test apps/console/tests/i18n.test.mjs`, `pnpm --filter console check-types`, `pnpm --filter console lint`, and `pnpm --filter console build`. Exercise login, menu navigation, agent voice settings and browser preview in both locales. Do not translate identifiers, telephone states or persistent business data.
