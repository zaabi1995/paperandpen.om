# Gauntlet brief — the app half, erp.paperandpen.om

## The bar
`.gauntlet/bar/wave-APP-transactions.png` — a real Wave in-app screen (Transactions), cropped from
Wave's own accounting product page. This is the only publicly fetchable view of Wave's app; the
real product sits behind a login we do not have. Say so rather than pretending otherwise.
Supporting context: `wave-accounting--desktop--fold.png`, `wave-payments--desktop--fold.png`.

**Look at the PNG.** This file only records what was verified.

## What Wave's app actually does (verified from the capture)

**The app is cooler than the marketing site.** Content ground is a very pale blue-white, near
`#f7faff`, not the marketing cream. Do not carry the cream into the app.

**Headings are SANS, not serif.** `Transactions` is a large bold geometric sans. The marketing
site's serif display face does not appear in the product. This is the single easiest thing to get
wrong when porting a marketing look into an app.

**Left rail.** Narrow, icon-only, pale ground, blue icons. The active item sits in a pale-blue
rounded-square pill. No labels at this width, no dark sidebar.

**Controls.** `Filter`, `Sort`, `Auto updates` are OUTLINED pills — blue 1px border, blue label,
transparent fill. The account selector is a plain white rounded field with a soft border.

**Table.** This is the heart of it:
- Pale grey header row, small semibold dark labels, no uppercase.
- Generous row height, roughly 72px, so the table breathes.
- Thin light horizontal separators only. **No vertical rules, no zebra striping, no card per row.**
- Primary cell (Description) is bold and near-black; secondary cells are a muted grey.
- The date column is a muted slate-blue and semibold, treated as metadata not as data.
- A leading checkbox column with a `Select all` row above the header.
- The whole table sits inside one white rounded container with a soft border and no drop shadow.

## Our constraints (these are hard, and they are why this is not a free-for-all)
1. **Scope to one tenant.** The frontend is a single Vite bundle baked into one nginx image that
   serves erp.bhd.om AND every Paper & Pen tenant. Every Wave rule must sit behind the
   `data-product` attribute set on `<html>` at `frontend/index.html:46`, the mechanism already used
   at `frontend/src/style/bhd-tokens.css:112`. An unscoped edit to `theme.css :root`, to
   `customAntd.css`, or to the `RootApp.jsx` ConfigProvider tokens changes BHD, Kairuz, Hosn,
   Alali, ATS, Bin Mirza and QPlus at the same time. That is the failure mode to avoid.
2. **`data-product="paperandpen"` is NOT unique to erp.paperandpen.om.** It also matches every
   unlisted `*.paperandpen.om` tenant. Give erp.paperandpen.om its own product key and register it
   in BOTH `frontend/index.html` CUSTOM_DOMAINS and `frontend/src/config/tenantHosts.js` — that
   file's own header says the two must stay in sync. Then make sure the host still picks up the
   existing `[data-product="paperandpen"]` brand rules it would otherwise lose.
3. **CSS cannot reach everything.** Border radius, control height and font family are AntD
   ConfigProvider tokens in `frontend/src/RootApp.jsx:136-165`. Those need a parallel branch keyed
   on `window.__ERP_PRODUCT`, not a stylesheet.
4. **Coverage is uneven and you must report it honestly.** Roughly 191 pages under
   `frontend/src/pages` render their own raw AntD `<Table>`, and 89 set their own `emptyText`.
   A token-and-selector restyle will reach some pages and not others. Report which pages you
   actually verified, and do not claim the app is done when it is not.
5. Work only in the worktree `/Users/ali/bhd-erp-wave` on branch `design/pnp-wave`. Never touch
   `/Users/ali/bhd-erp`. Do not commit, do not push, do not deploy.
6. The local dev environment points at a local mongo and a local backend. It must never be
   repointed at erp.bhd.om or erp.paperandpen.om.

## Verified facts about the local environment (do not rediscover these)

Full recipe: `/Users/ali/bhd-erp-wave/.wave-dev/RECIPE.md`. Both servers may already be running.

- Backend: `cd /Users/ali/bhd-erp-wave/backend && NODE_OPTIONS="--require /Users/ali/bhd-erp-wave/.wave-dev/local-fs-shim.js" npm run dev` on :8888. **The shim is mandatory** — without it the
  backend dies at require time trying to `mkdir /app/uploads/credit-docs`, which is read-only here.
- Frontend: `cd /Users/ali/bhd-erp-wave/frontend && npm run dev` on :3000.
- Mongo: `mongodb://127.0.0.1:27017/bhd-erp-wave-dev`, a dedicated dev database.
- Login: **`admin@local.dev` / `wavedev123`**. Do NOT invent an `@example.test` or `@local.test`
  address — login validates against the IANA TLD list and reserved TLDs fail with a misleading
  `Invalid email or password.` 400 before the password is ever checked.
- Baseline screenshots to compare against: `/Users/ali/bhd-erp-wave/.wave-dev/shots/baseline-*.png`.

**The accent custom property is `--color-accent`, NOT `--bhd-accent`.** Measured live. BHD resolves
to teal `#009bc1`; `[data-product="paperandpen"]` resolves to navy `#1e2d5a`.

**`data-product` resets on every full page load.** `frontend/index.html` re-stamps it from the
hostname on each real document load, so it survives SPA navigation but NOT `page.goto`. Re-apply
the override after every `goto`, or your screenshot silently shows the BHD look and you will draw
the wrong conclusion. `/Users/ali/bhd-erp-wave/.wave-dev/verify-product-override.mjs` prints the
resolved `--color-accent` for any product value; use it to confirm the scope actually bit.

**`pnp` does not exist yet as a product key.** Forcing it today changes nothing (it falls through to
the BHD teal). Creating it, and extending the existing `[data-product="paperandpen"]` selector
lists in `frontend/src/style/bhd-tokens.css` so the host does not lose its brand tokens, is the
foundation agent's job.

**Known dirty file:** `frontend/.env.development` is a MODIFIED TRACKED file, repointed to
localhost so the app talks to the local backend. Leave it alone while working; it must be reverted
with `git checkout -- frontend/.env.development` before anything is ever committed.

## Automated design-hook findings, already triaged (do not re-litigate)

1. `_empty.css` "broken image" — **FALSE POSITIVE.** The scanner matched the characters `<img>`
   inside a CSS *comment* that explains AntD's empty presets are inline `<svg>`. There is no img
   tag. Leave the comment alone.
2. `_shell.css` animating `width` on the rail — **contextually correct, keep it.** A rail that
   expands on hover has to animate width; `transform` would scale its contents instead of
   revealing them. But keep the transition short and do not add more animated layout properties.
3. `frontend/src/main.jsx` uses Inter in its fatal-error fallback screen — **out of scope, do not
   touch.** That file is UNSCOPED and shared by every tenant, so changing its typeface would
   change erp.bhd.om too. It is also a crash screen, not product typography. If it ever gets
   fixed, that is a separate portfolio-wide decision, not part of this tenant-scoped restyle.

**A design decision the builder made that goes beyond a restyle:** the rail now floats over the
page and expands on hover, rather than sitting statically at 220px. That changes the app's
interaction model, not just its skin. It may well be right — the bar's rail is icon-only — but it
must be judged as an interaction change, and it must remain keyboard reachable (the current rule
uses `:hover` and `:focus-within`, which is correct; do not drop `:focus-within`).

## Where our app stands today (from the baseline shots)
Teal accent, a 220px sidebar with text labels, UPPERCASE table column headers with sort carets,
outlined "Company" type pills, and a floating decorative widget in the bottom-right corner. Against
the bar it reads busier and more administrative, less like calm financial software.

## Re-triaged after round 2 (files changed, findings re-checked, verdicts unchanged)

- `_empty.css` "broken image" — **FALSE POSITIVE, third time.** The scanner keeps matching the
  characters `<img>` inside a CSS *comment* explaining that AntD's empty presets are inline `<svg>`.
  There is no img tag in that file. Do not reword the comment to appease a scanner.
- `_shell.css` animating `width` on the rail (two rules) — **contextually correct.** A rail that
  expands on hover has to animate width; `transform` would scale its contents instead of revealing
  them. Both rules correctly pair `:hover` with `:focus-within`, so the keyboard reaches it too.

## One thing to CHECK in the next round (not yet verified either way)

The expanded rail sizes itself with `flex: 0 0 var(--wave-rail-w-open)`, i.e. via **flex-basis**,
but the transition lists only `width` and `box-shadow`. If flex-basis is what actually drives the
layout here, the rail may be JUMPING open rather than easing, and the transition would be
decorative. Nobody has watched it in a browser. Confirm it actually animates before anyone calls
this piece finished — and if it jumps, transition `flex-basis` too rather than adding more width
rules.

## Design-scanner noise in this file set (4 of 4 findings were prose in comments)

Re-checked again after the fix round. Every current finding in `_shell.css` and `_empty.css` is the
scanner matching ENGLISH PROSE INSIDE A CSS COMMENT, not any rule:

- `_shell.css` "side-tab accent border" — the comment it matched is *documenting a side-stripe bug
  the builder FIXED*: it explains that BHD's inline teal was a `border-left` stripe "already zeroed
  in 4b". The scanner is flagging the description of the fix as if it were the defect.
- `_empty.css` "broken image" — the comment explains that `:has()` distinguishes a page-supplied
  `<img>` from AntD's inline `<svg>`. There is still no img tag in the file.

The two `layout-transition` findings on the rail remain contextually correct: a rail that expands on
hover must animate width, and a critic has now confirmed in a browser that it EASES rather than
jumps.

DO NOT reword these comments to quiet a scanner. They are the most useful documentation in the file
set, and they are why the next person will not reintroduce the stripe.

## Design-hook findings, already triaged — do NOT churn on these

1. `_empty.css` [broken-image] — FALSE POSITIVE. The rule is
   `[data-product="pnp"] .ant-empty .ant-empty-image > svg { display: none }`.
   There is no `<img>` anywhere near it. It hides AntD's inline grey-box SVG so
   the tile can be reused, and the code comment already says a real `<img>` a
   page deliberately supplied is left alone. Nothing broken ships.

2. `_shell.css` [side-tab] — FALSE POSITIVE, and it is the exact inverse of the
   finding. That block REMOVES BHD's inline teal `border-left: 3px` stripes from
   the KPI cards and the price-calculator banner. The hook matched the words
   `border-left: 3px solid` inside a comment explaining what is being stripped.
   Documenting a pattern in order to delete it is not shipping it.

3. `_shell.css` [layout-transition] — REAL, and accepted with evidence. It
   animates width / min-width / max-width / flex-basis on the rail. For a
   sidebar expand the layout change IS the animation; transform and opacity
   cannot express it. It was measured rather than assumed: a rAF trace captured
   19 intermediate frames from 76px to 268px over 174ms, so it eases smoothly.
   Do not "fix" this into a transform and break the expand.
