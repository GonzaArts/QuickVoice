# QuickVoice console localization (fork)

The customer console uses English source messages as stable lookup keys with native `es` and `en` dictionaries under `apps/console/src/i18n/messages/`. Only interface copy is translated; user-entered prompts, caller transcripts, tools, model IDs, API payloads and business data remain unmodified.

- Default locale: Spanish (`es-ES`).
- English: select `English` from the language picker in the console header.
- Preference: first-party `qv_locale` cookie, one year, SameSite=Lax, per browser. No database migration.
- SSR: `apps/console/src/app/layout.tsx` reads the cookie to set `html lang`, avoiding hydration differences.
- Client strings: use `useT()("English source message")`, or `<Trans>English source message</Trans>` for static JSX copy.
- Placeholders: `t("Hello, {name}", {name})` supports interpolation without translating user content.
- Formats: `formatNumber(locale, value)`, `formatDate(locale, value)`; timestamps continue to use canonical values in APIs.
- Unknown messages fall back to their original English text, never to an empty string.
- Update both dictionaries together; the `node --test apps/console/tests/i18n.test.mjs` check rejects missing keys.
- No new runtime dependencies, changes to agent-provider settings or database changes. This fork deliberately avoids adding `next-intl` to the pinned workspace dependency lockfile.

## Validation

From the repository root run `node --test apps/console/tests/i18n.test.mjs`, `pnpm --filter console check-types`, `pnpm --filter console lint`, and `pnpm --filter console build`. Exercise login, menu navigation, agent voice settings and browser preview in both locales. Do not translate identifiers, telephone states or persistent business data.
