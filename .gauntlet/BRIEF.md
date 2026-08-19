# Gauntlet brief — Paper & Pen must beat waveapps.com

## The bar
Real screenshots live in `.gauntlet/bar/` (captured 17 Aug 2026, 1440x900 desktop @2x and
390x844 mobile @2x, `--fold` = above the fold, `--full` = full page):

- `wave-home--{desktop,mobile}--{fold,full}.png`
- `wave-pricing--…`, `wave-invoicing--…`, `wave-accounting--…`, `wave-payments--…`, `wave-payroll--…`

**Look at the PNGs. Never work from this description alone.** This file only records what was
verified so nobody drifts; the images are the authority.

## What Wave actually does (verified from the captures)

**Ground.** Warm off-white, roughly `#faf3ef`. Never dark. Full-bleed colour bands stack down the
page: cream → periwinkle `#9aa8f5` → pale blue `#cfe0fb` → cream. The band IS the section divider;
there are no rules, no boxes-on-boxes.

**Ink.** Deep navy, roughly `#0d1b5e`, for every headline and most body text. Very high contrast
against the cream.

**Primary.** Electric blue, roughly `#1650ee`, used only for CTAs, links and price numerals.
Buttons are **full pills** (`border-radius: 999px`), solid fill, white label, generous horizontal
padding, no shadow, no gradient, no border.

**Type.** A transitional serif for display, set very large and tight (home H1 ≈ 84px/0.95 at
desktop), and a geometric sans for body at a comfortable ~18px/1.6. Headlines are two or three
short lines, never a paragraph.

**The signature move.** One word per headline is set in *italic serif* and underlined with a
hand-drawn purple squiggle (`Plans to make your plans _happen_`). Hand-drawn doodles recur: a
curved arrow pointing at a green `Save $38` badge. This is the single most distinctive thing about
the page and the easiest thing to lose.

**Product imagery.** A real app screenshot tilted in 3D perspective, bleeding off the right edge,
with small white "floating card" callouts overlapping it (`Main Street Reno Project`).

**Pricing cards.** Grey-tinted free card, pale-blue-tinted recommended card with a blue border and
a `Recommended` tab notched onto its top edge. Big blue price numeral, small unit suffix. A
pale-blue segmented pill toggle above with a white active segment.

**Restraint.** No glassmorphism, no mesh gradients, no glow, no gradient text, no drop shadows on
cards, no dark mode. The energy comes from flat colour blocks, scale contrast, and the doodles.

**The accent hue rotates per page, the accent ROLE does not.** Verified across the captures: the
CTA pill is electric blue on home and pricing, lilac on `wave-accounting`, orange on
`wave-payments`. So "one accent" means one *job* — the pill and the links — not one hue forever.
Each product page may take its own accent, but it spends it only on interactive things. Never
scatter the accent onto badge dots, stars, chart fills or icon decoration while the CTA sits
unaccented; that was exactly the mistake that lost foundation round 1.

## Where we are today
`.gauntlet/ours/pnp-*.png`, same naming. Our current home is a dark navy mesh hero with a
copper-gradient headline, glass card, `rounded-xl` buttons and glow shadows. It reads heavier,
darker and more templated than the bar. The rest of the site is cream with copper accents.

## Non-negotiables (these are constraints, not taste)
1. **Lighthouse stays 100/100/100/100** on SEO, accessibility, best practices, performance.
   WCAG AA contrast holds. One `<h1>` per page. No render-blocking font load.
2. **International, never Oman-only.** Any currency, configurable tax. Do not put OMR-only figures
   in hero mockups; show a neutral or multi-currency example.
3. **Fonts come from fonts.bhd.om only.** Never Google Fonts. If a new family is needed, say so
   and stop; do not add a `fonts.googleapis.com` link.
4. **No emojis** except locale flags in the language switcher.
5. All 5 locales (en, ar, hi, bn, ur) keep key parity. RTL (ar, ur) must not break.
6. Internal links keep trailing slashes. Do not touch `src/lib/api.js`.
7. Do not copy Wave's logo, wordmark, product screenshots, or copy verbatim. Match the *design
   language*, not the assets.

## Consume the foundation, do not re-specify it (added after round 3)

The foundation owns the type scale, the ink, the button shape and the band colours in
`tailwind.config.js` and `src/styles/global.css`. Every other piece **consumes** those tokens.

This was a real failure, not a hypothetical: the home `<h1>` was rewritten as
`text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.04] mb-6`, and those utilities silently beat
the foundation's token. The rendered headline came out at 72px with 1.04 leading and weight 700,
where the foundation had deliberately set 88px, 1.12 and weight 500 to answer a critic's measured
verdict. Both pieces then looked wrong and each critic would have blamed the other piece.

So:
- **Do not put `text-<size>`, `leading-*`, `font-bold` or `tracking-*` on a display heading.** Let
  the `h1` take the foundation's scale, or use the `.display-1` / `.display-2` classes.
- If a heading genuinely needs a different size, that is a foundation change. Say so in
  "concerns"; do not force it locally with a utility.
- The same rule applies to button shape, ink colour and band backgrounds: use the token or the
  component class, never a one-off hex or radius.
- A silent font fallback caused three lost rounds on its own. `tailwind.config.js` and the FONTS
  url in `BaseLayout.astro` must always name the same display family. The display face is
  **Source Serif 4** and it is now correctly requested. Do not reintroduce Playfair Display.

## Still unfixed as of round 3, and it is a rule violation, not taste

The hero product mockup still reads `1,250.000 OMR` and `2,840 OMR`, and the body copy still says
"Built in Oman, used by businesses across the GCC". The product is international; an OMR-only
mockup contradicts the "any currency" claim sitting directly above it. Show a neutral or clearly
multi-currency example. Oman can be a credibility detail elsewhere on the page, not the hero's
only currency.

## IMAGERY: the real-capture route was tried and it does NOT work. Read this before retrying.

The critic has twice said "ship a capture of the real product". The lead agent went and did it,
logging into the local ERP and photographing the real Invoice List. Evidence is in
`.gauntlet/erp/{dashboard,invoices,customers,quotes}.png`. Look at them before deciding anything.

A raw capture is **unusable on this site**, for four reasons that are facts, not taste:
1. It carries the **BHD logo**. Tenant branding comes from `TenantContext` / the `theme_*`
   settings, NOT from the `data-product` attribute, so forcing the Paper & Pen product key does
   not rebrand it. The capture is visibly another company's product.
2. Amounts are **OMR at three decimals** (`123,456.789`). The hero copy directly above claims
   "any currency". Shipping that contradicts the page.
3. The seeded clients are Oman-named (Salalah Logistics Co, Muscat Media House), which undercuts
   the international positioning that is a hard rule on this site.
4. A decorative floating widget sits over the content.

Editing that screenshot into a Paper & Pen product shot would be fabricating a record of a product
state that never existed. Do not do it.

**So fix the drawing instead, and fix the thing the critic actually diagnosed:** it reads as an app
that has not finished loading. Concretely:
- The left panel's five blank beige pill bars ARE skeleton-loader language. Give them real module
  names (Dashboard, Invoices, Quotes, Inventory, HR, Reports) at a legible size.
- The chart is seven flat one-tone rectangles with no axis, no gridlines and no month labels. Add
  month labels and a baseline so it reads as a record rather than a placeholder.
- The crop still severs a bar and a tile mid-tile on the right edge. Cut flat chrome only.
- The two white chips cover the "Today's Overview" heading and have no pointer tail. Give them a
  tail and a soft shadow so they annotate rather than obscure.
- On mobile the fold carries no product image at all and one chip is clipped at the bottom edge.

## FORMS: the apostrophe fix is site-wide, and it is in your file set

The critic found a straight typewriter apostrophe (U+0027) in the 60px serif headline "What's your
company name?" — the largest piece of type on the page. The bar uses a proper curly apostrophe
(U+2019) everywhere. Sweep ALL FIVE `src/i18n/ui/*.json` for `'` inside English prose and replace
with `’`. Be careful NOT to rewrite apostrophes inside code, URLs, or the Arabic/Urdu strings where
it is not a contraction.

Also from that verdict, both worth doing:
- The signup logo is a soft raster in rgb(60,123,190), a FOURTH blue matching neither the headline
  navy (13,27,94) nor the CTA (22,80,238). Ship it as SVG recoloured to the headline navy so the
  mark reads as part of the system rather than a pasted asset.
- The right-hand panel repeats itself: three of five rows restate the chip and the row above them,
  and "Languages supported 5" / "Currency billing Any" are not facts anyone decides on. Replace
  them with the two that actually de-risk signing up: what happens to the data if you stop paying,
  and that no card is taken now. Delete the duplicated closing paragraph.

## Design-hook findings already triaged (do not churn on these)

`PricingTable.astro` "border accent on rounded element" — **FALSE POSITIVE, leave it.** It is not
a card border. It is a 2px electric highlight capping the recommended COLUMN of the comparison
table (`border-t-2` on the header cell, `border-b-2` on the last cell, with `rounded-t-card` /
`rounded-b-card`). Verified by screenshot: the border follows the rounded caps cleanly with no
clash, and it mirrors the bar's own recommended-plan treatment, which is the whole point. 2px is
a highlight, not a slab.

## An open call for the forms piece

The error alert in `SignupForm.tsx` and `LoginForm.tsx` uses a thick red side stripe
(`border-s-4 border-s-red-600`). An automated design scanner flags a one-sided accent border as a
common AI-generated-UI tell.

It is a genuinely borderline call, so decide it deliberately rather than by reflex:
- **For keeping it:** on an *alert* specifically, a severity stripe encodes state in form as well
  as colour, which helps anyone who does not perceive the red. It is a long-standing convention,
  and `border-s` correctly mirrors for ar/ur.
- **For dropping it:** the bar is relentlessly flat. Nothing on Wave carries a side accent, and
  our forms have now lost two rounds running. Flat red type on white, or a small inline icon, may
  read calmer and more like the bar.

Whichever you choose, the error text must still say what went wrong AND how to fix it.

## How a round works
A builder edits only its own file set. Then the whole site is built once. Then a fresh critic
screenshots the result, puts it beside the Wave capture **blind**, picks a winner, and names the
single biggest remaining gap. The piece is done only when the critic picks ours.
