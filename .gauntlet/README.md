# The waveapps.com gauntlet

Paper & Pen was run against [waveapps.com](https://www.waveapps.com) as a
ten-piece design gauntlet: seven pieces on this marketing site, three on the ERP
app at `erp.paperandpen.om`. A piece counted as won only when a fresh critic,
shown both blind, picked ours. All ten won, on 20 August 2026.

| Piece | Final round | Winner |
|---|---|---|
| foundation (colour and type) | r6 | ours |
| nav and header | r3 | ours |
| home hero and section rhythm | r1 | ours |
| illustration and product imagery | r12 | ours |
| pricing | r2 | ours |
| inner marketing pages | r1 | ours |
| forms | r6 | ours |
| app shell | r8 | ours |
| tables | r9 | ours |
| empty states | r10 | ours |

## What is tracked here, and what is not

`notes/<piece>-r<n>.json` is every verdict, each with the measured gap that sent
the piece back for another round. Those files are the argument: they say what
was wrong, in numbers, and how it was proven. They do not regenerate, so they
are in git.

`BRIEF.md` and `BRIEF-APP.md` are the standards the builders worked to.
`verify.mjs` is the site's design and accessibility gate — 17 checks, each one
written because the defect it catches actually happened during the gauntlet and
was invisible until something measured it. Run it against a served build:

```
npm run build && npx serve -s dist -l 4321
node .gauntlet/verify.mjs http://localhost:4321
```

`bar/` (the Wave reference captures), `ours/` and `erp/` are screenshots. They
are ~198MB and every one of ours regenerates from the source, so they are
ignored. The Wave captures are a snapshot of somebody else's site on the day it
was judged; they live on the machine that took them.

## The rule the app half rests on

Every app-side CSS selector starts at `[data-product="pnp"]` and every JS branch
is gated on that key, so BHD, Kairuz, Hosn, Alali, ATS, Bin Mirza, QPlus and the
unlisted `*.paperandpen.om` tenants render byte-identically. Proven by isolation
at 0 differing pixels, against a same-session noise floor, while the identical
toggle under the flagship key moves 2 to 4 million. Do not add an unscoped rule
to `frontend/src/style/wave/*.css` in the ERP repo.
