/** @type {import('tailwindcss').Config} */

/*
 * Paper & Pen design tokens — "flat bands" system.
 *
 * The language is cool and flat: a warm off-white ground, a deep ink navy for
 * type, one electric blue reserved for actions and links, and full-bleed pastel
 * bands (periwinkle / pale blue / navy) that ARE the section dividers.
 *
 * Hard rules baked into these tokens:
 *   - ONE GROUND. `paper` is the page, top to bottom, and the fold is always
 *     paper. Navy is INK — it is not a ground and it is not a button fill.
 *     (`band-navy` exists for the footer only.) When navy was doing all three
 *     jobs at once, nothing on the page separated from anything else.
 *   - ONE INK. There is no "secondary body" colour any more. Headline, body,
 *     microcopy, labels and table cells are all `ink-500` at 14.4 : 1, exactly
 *     the way the bar does it (its H1 and its body copy are the SAME navy,
 *     verified by sampling the capture: both #001b66). Hierarchy is carried by
 *     SIZE and WEIGHT, never by lightening the colour. `ink-400` is deliberately
 *     a duplicate of `ink-500` so the ~69 existing `text-ink-400` call sites in
 *     pages other pieces own heal without those files being touched.
 *     The old `ink-400` (#404f8f, 7.0 : 1) was half the headline's contrast and
 *     was what made the page read hazy rather than certain.
 *   - ONE ACTION COLOUR. `electric` fills every primary button and every link.
 *     Copper is not an accent any more: its single remaining job is the warm
 *     secondary CTA (`.btn-accent`, copper-300 fill + NAVY label). It never
 *     decorates badge dots, star rows, chart fills or headlines again.
 *   - No gradients, no glow, no glass, no mesh, no gradient text, no dark mode.
 *   - Buttons are full pills (rounded-pill), solid fill, no shadow.
 *   - Electric blue is for CTAs, links and price numerals ONLY. Never a background wash.
 *   - White text is only allowed on electric-500/600, ink-500/600/700, violet-600,
 *     mint-700 and copper-400/500. NEVER on peri-* or sky-* (fails AA).
 *   - On the periwinkle band, actions use ink (navy) fill, not electric — electric
 *     on periwinkle is 2.7:1 and fails.
 *
 * Every pairing listed in the comments is a measured WCAG contrast ratio.
 */

export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        /* ---------------------------------------------------------------
         * PAPER — the ground. Warm off-white, never dark.
         * `bg-paper` is the page. paper-100 is the card. paper-300 is a hairline.
         * ------------------------------------------------------------- */
        /* The ground is sampled straight off the bar's capture (#f9f4f1) rather
         * than eyeballed — the previous #faf3ef carried a faint pink cast that
         * read warmer than the bar beside it. */
        paper: {
          DEFAULT: '#f9f4f1', //  ink-500 on it = 14.41 : 1
          50: '#fefcfb',
          100: '#fdfaf8', //  card surface, ink-500 = 15.1 : 1
          200: '#f3ece7',
          300: '#e9e0d9', //  hairline / divider
          400: '#dbd0c6',
          500: '#c7b8ac',
          600: '#a8968a',
        },

        /* ---------------------------------------------------------------
         * INK — deep navy. EVERY headline, body line, label and caption.
         *
         * There is exactly one text colour. 500 and 400 are the same navy on
         * purpose (see the header note): the bar sets its H1 and its body copy
         * in one ink, and copying that is what makes a page read certain.
         *
         *   500 / 400  #0d1b5e  14.41 : 1 on paper, 15.72 : 1 on white  ← ALL TEXT
         *   300        #5c68a0   4.88 : 1 on paper  ← placeholders / disabled ONLY
         *   200        #7c88b8   3.17 : 1 on paper  ← NON-TEXT only: hairlines,
         *                        dividers, an inactive toggle track (clears the
         *                        3:1 bar for UI components, 1.4.11)
         *   100 / 50            tints and washes, never text
         *
         * Nothing between 300 and 500 exists, so there is no "slightly quieter
         * body" step to reach for. If copy needs to recede, make it smaller or
         * lighter in WEIGHT — do not lighten the colour.
         * ------------------------------------------------------------- */
        ink: {
          50: '#eef1fb',
          100: '#e0e5f7',
          200: '#7c88b8', //  non-text: hairline / divider / inactive track
          300: '#5c68a0', //  placeholder & disabled text — AA at 4.88 : 1
          400: '#0d1b5e', //  = 500. Deliberate duplicate; see header note.
          500: '#0d1b5e', //  THE ink — 14.41 : 1 on paper, 15.72 : 1 on white
          600: '#0a1449',
          700: '#071033',
          900: '#04081c',
        },

        /* ---------------------------------------------------------------
         * ELECTRIC — the one action colour. CTAs, links, price numerals.
         * white on 500 = 6.15 : 1  ·  500 on paper = 5.60 : 1
         * Use 600 for links sitting on the sky band (5.92 : 1).
         * ------------------------------------------------------------- */
        electric: {
          50: '#eef2ff',
          100: '#dfe7ff',
          200: '#c2d2ff',
          300: '#8da8ff',
          400: '#3f6ff5',
          500: '#1650ee', //  primary action
          600: '#1442c9', //  hover / on tinted bands
          700: '#0f34a0',
        },

        /* ---------------------------------------------------------------
         * PERI — periwinkle band. Full-bleed section colour.
         * INK ONLY on this band: ink-500 = 6.96 : 1.
         * White (2.26) and electric (2.72) both FAIL here.
         * ------------------------------------------------------------- */
        peri: {
          100: '#dfe4fd',
          200: '#c6cef9',
          300: '#b3bdf7',
          400: '#9aa8f5', //  THE periwinkle band
          500: '#7f90f0',
          600: '#6272e4',
        },

        /* ---------------------------------------------------------------
         * SKY — pale blue band. The quieter alternating section.
         * ink-500 = 11.76 : 1  ·  electric-600 = 5.92 : 1  ·  violet-700 = 6.72 : 1
         * ------------------------------------------------------------- */
        /* NOTE: `sky` and `violet` are Tailwind defaults — the full scale is
         * declared here so no stock swatch leaks through the deep merge. */
        sky: {
          50: '#f5f9ff',
          100: '#eaf2fe',
          200: '#dceafc',
          300: '#cfe0fb', //  THE pale blue band
          400: '#b3d1f8',
          500: '#8fb8f2',
          600: '#5f96e4',
          700: '#3a6fb8',
          800: '#2a5088',
          900: '#1b3559',
          950: '#0f1f36',
        },

        /* ---------------------------------------------------------------
         * TINT — the two flat card fills the bar uses on its pricing cards.
         * Sampled from the capture: a neutral grey for the free plan, a pale
         * blue for the recommended one. Both are card FILLS, never page bands.
         *   ink-500 on grey = 13.7 : 1   ·  electric-500 on grey = 5.36 : 1
         *   ink-500 on blue = 13.8 : 1   ·  electric-500 on blue = 5.38 : 1
         * ------------------------------------------------------------- */
        tint: {
          grey: '#ecf0f3', //  the quiet / free plan card
          blue: '#e6f1fe', //  the recommended plan card
        },

        /* ---------------------------------------------------------------
         * VIOLET — the accent. Eyebrows, the hand-drawn squiggle, "new" pills.
         * 600 is the AA-safe text/fill weight (6.47 on paper, white on it 7.10).
         * 500 is DECORATIVE only (the squiggle stroke), never a text colour.
         * ------------------------------------------------------------- */
        violet: {
          50: '#f6f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#7c3aed', //  decorative squiggle stroke — not a text colour
          600: '#6d28d9', //  AA-safe accent text / fill
          700: '#5b21b6', //  on the sky band
          800: '#4a1a94',
          900: '#3b1477',
          950: '#240a4a',
        },

        /* ---------------------------------------------------------------
         * MINT — the small "you save" badge and success ticks. Nothing else.
         * ink-900-on-mint-100 = 11.10 : 1
         * ------------------------------------------------------------- */
        mint: {
          100: '#d9fbe6',
          200: '#b7f3cd',
          500: '#12a05a',
          700: '#0b6a37', //  white on it = 4.9 : 1
          900: '#0b3d1f',
        },

        /* ---------------------------------------------------------------
         * EMERALD — success ticks and "paid" marks only.
         * `emerald` is a Tailwind default, so the whole ramp is declared here
         * to stop a stock swatch leaking through the deep merge: stock
         * emerald-400 is 1.90 : 1 on paper and was being used for check icons.
         * This ramp is shifted darker so every step is legible on the ground.
         *   400 = 3.43 : 1 — ICONS ONLY (clears the 3:1 non-text bar)
         *   500 = 5.00 : 1 — the AA-safe text weight
         * ------------------------------------------------------------- */
        emerald: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#34d399',
          400: '#059669', //  icon-only
          500: '#047857', //  AA-safe text — 5.00 : 1 on paper
          600: '#065f46', //  7.00 : 1
          700: '#064e3b', //  8.85 : 1
          800: '#053e2f',
          900: '#042f23',
          950: '#022c22',
        },

        /* ---------------------------------------------------------------
         * COPPER — demoted. It is no longer the accent; it now has exactly one
         * job: the warm secondary CTA on feature pages (flat orange fill with a
         * NAVY label, never white) plus rare amber emphasis text.
         *   copper-300 fill + ink-500 label = 7.87 : 1   ← the button
         *   copper-400 as text on paper     = 5.01 : 1   ← AA-safe amber
         *   white on copper-400             = 5.02 : 1
         * Never use copper for headlines, links or large areas.
         * ------------------------------------------------------------- */
        copper: {
          50: '#fff4ea',
          100: '#ffe6cf',
          200: '#ffc899',
          300: '#ffa15c', //  the flat orange CTA fill (navy label only)
          400: '#a8500b', //  AA-safe amber text
          500: '#8a4b12',
          600: '#6f3c0f',
        },

        /* ---------------------------------------------------------------
         * LEGACY ALIASES — retuned in place so existing pages inherit the new
         * system instead of drifting. Prefer `paper`, `ink`, `electric`.
         * `cream-50` is now the paper ground and the on-navy text colour.
         * ------------------------------------------------------------- */
        cream: {
          50: '#f9f4f1',
          100: '#f3ece7',
          200: '#e9e0d9',
          300: '#dbd0c6',
          400: '#c7b8ac',
          500: '#a8968a',
        },
        /* Mirrors the ink ramp exactly, including the 400 = 500 collapse, so a
         * legacy `text-brand-400` cannot reintroduce the weak second tier. */
        brand: {
          50: '#eef1fb',
          100: '#e0e5f7',
          200: '#7c88b8',
          300: '#5c68a0',
          400: '#0d1b5e',
          500: '#0d1b5e',
          600: '#0a1449',
          700: '#071033',
        },
      },

      fontFamily: {
        /*
         * Display is a TRANSITIONAL serif, matching the bar's moderate-contrast
         * bracketed face rather than Playfair's high-contrast Didone look.
         *
         * "Source Serif 4" is VERIFIED served by fonts.bhd.om: variable 100-900,
         * true italic (which the `.accent-italic` headline word needs), optical
         * sizing, and licence OFL-1.1 / Apache — clean for a public site.
         *
         * BaseLayout.astro NOW REQUESTS IT. It previously did not, so the browser
         * silently fell back to the next name in this list. Playfair Display was
         * that name, which is why three rounds of critique kept reporting a
         * high-contrast didone even after this line already said Source Serif 4.
         * Playfair is removed from the stack entirely so the fallback can never
         * reintroduce the didone; Georgia and Cambria are both closer to the
         * transitional model we want.
         *
         * If you change this list, change the FONTS url in BaseLayout.astro in
         * the same commit or you reintroduce exactly that silent-fallback bug.
         * Never add fonts.googleapis.com / fonts.gstatic.com.
         */
        display: ['"Source Serif 4"', 'Georgia', 'Cambria', 'serif'],
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        arabic: ['"IBM Plex Arabic"', '"Noto Sans Arabic"', '"Segoe UI"', 'Tahoma', 'sans-serif'],
      },

      fontSize: {
        /* Display scale — large and tight. Home h1 tops out ≈ 88px, matching the bar. */
        /* Leading opened on the round-3 verdict. The critic measured our headline
         * at ~1.02 effective, leaving 2.5 CSS px between the descenders of one
         * line and the ascenders of the next, where the bar leaves 22 CSS px on a
         * headline of the same cap height. Tight tracking stays; the leading is
         * what was making it feel cramped rather than confident. */
        'display-sm': ['clamp(2rem, 1.30rem + 2.9vw, 3rem)', { lineHeight: '1.16', letterSpacing: '-0.02em' }],
        'display': ['clamp(2.5rem, 1.45rem + 4.4vw, 4.25rem)', { lineHeight: '1.12', letterSpacing: '-0.026em' }],
        'display-lg': ['clamp(2.875rem, 1.35rem + 6.4vw, 5.5rem)', { lineHeight: '1.12', letterSpacing: '-0.032em' }],
        /* Body — calm, roomy. */
        'lede': ['clamp(1.0625rem, 1rem + 0.3vw, 1.25rem)', { lineHeight: '1.6' }],
        'body': ['1.0625rem', { lineHeight: '1.65' }],
      },

      borderRadius: {
        pill: '999px',
        card: '1rem',
      },

      /* Shadows are deliberately near-flat. `lg`/`xl`/`2xl` are overridden so no
       * existing page can keep a glow. Only `float` is allowed to lift, and only
       * for the small white callout cards that overlap product imagery. */
      boxShadow: {
        none: 'none',
        sm: '0 1px 1px rgba(13, 27, 94, 0.04)',
        DEFAULT: '0 1px 2px rgba(13, 27, 94, 0.06)',
        md: '0 1px 2px rgba(13, 27, 94, 0.06)',
        lg: '0 2px 4px rgba(13, 27, 94, 0.06)',
        xl: '0 6px 18px -10px rgba(13, 27, 94, 0.20)',
        '2xl': '0 10px 28px -14px rgba(13, 27, 94, 0.22)',
        float: '0 8px 24px -12px rgba(13, 27, 94, 0.20)',
        card: '0 1px 2px rgba(13, 27, 94, 0.06)',
      },

      backgroundImage: {
        /* Neutralised: the old paper noise fought the flat language. Kept as an
         * empty transparent tile so existing `bg-paper-texture` refs still build. */
        'paper-texture': 'none',

        /* Hand-drawn squiggle used by the `.squiggle` display accent. */
        squiggle:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 14' preserveAspectRatio='none'%3E%3Cpath d='M3 9.6c16.4-4.1 32.7-4.4 49.1-1.6 16.3 2.8 32.7 4.1 49 1.4 16.4-2.7 32.7-5.2 49.1-3.1 16.3 2 32.6 5.6 46.8 6.3' fill='none' stroke='%237c3aed' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
      },

      animation: {
        'fade-up': 'fadeUp 0.5s ease forwards',
        'fade-in': 'fadeIn 0.4s ease forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
