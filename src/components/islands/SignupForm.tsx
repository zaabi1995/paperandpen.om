import { useState, useEffect } from 'react';
import {
  checkSubdomainAvailability,
  initiateSignup,
  isTrustedRedirectUrl,
  normalizeSubdomainCandidate,
} from '@/lib/api';
import { useTranslations, type Locale } from '@/i18n';

/*
 * The rail's standing facts, and they are now DECISIONS rather than trivia.
 *
 * This used to restate the home page's marketing stats: "Languages supported 5"
 * and "Currency billing / Any". Nobody with their hand on a signup button is
 * weighing those; they are specification, and specification belongs on the
 * marketing page it came from. What a person actually hesitates over before
 * handing a company's books to a stranger is two things — what it costs me
 * right now, and what happens to my data if I walk away — so those are the two
 * rows that replaced them. Setup time survives because it is the one standing
 * stat that IS a decision: it prices the effort of trying.
 *
 * Wave's equivalent panel is disciplined the same way: it only ever carries
 * the number the reader is weighing ($0, $190 USD/year, Billed annually).
 */
const FACTS = [
  { label: 'signup.rail.cardLabel', value: 'signup.rail.cardValue' },
  { label: 'trust.stat3_label', value: 'trust.stat3_value' },
  { label: 'signup.rail.dataLabel', value: 'signup.rail.dataValue' },
];

const MODULES = [
  { key: 'inventory', price: 5 },
  { key: 'hr', price: 8 },
  { key: 'accounting', price: 8 },
  { key: 'manufacturing', price: 10 },
  { key: 'reports', price: 5 },
];

/*
 * Field styling, kept as constants so every input on both auth pages is
 * literally the same object rather than the same string retyped.
 *
 *  - h-14 / text-base: tall and comfortable, and 16px stops iOS zooming the
 *    viewport on focus.
 *  - border-ink-200 (#7c88b8) is the non-text hairline token: 3.17 : 1 against
 *    both white and paper, so the control boundary clears WCAG 1.4.11.
 *  - The focus state moves the border to electric AND lays a soft electric
 *    halo behind it. The global `:focus-visible` outline still fires for
 *    keyboard users on top of this; the two stack rather than fight because
 *    the outline sits outside the ring.
 *  - Placeholders are ink-300, the one legitimately quieter step (4.88 : 1).
 */
const FIELD =
  'w-full h-14 rounded-xl border bg-white px-5 text-base text-ink-500 ' +
  'placeholder:text-ink-300 outline-none transition-colors duration-150 ' +
  'focus:ring-4 focus:ring-electric-100';
const FIELD_OK = `${FIELD} border-ink-200 focus:border-electric-500`;
const FIELD_BAD = `${FIELD} border-red-600 focus:border-red-600 focus:ring-red-100`;
const LABEL = 'mb-2 block text-sm font-semibold text-ink-500';

/*
 * THE ACTION.
 *
 * This used to carry `disabled:bg-ink-100 disabled:text-ink-300`, and because
 * step 1 opens on an empty field the button was disabled the instant the page
 * loaded. The only action on the page therefore rendered as a pale lavender
 * pill with grey text. It read broken, and it was visually weaker than the
 * plain blue "Log in" link in the header.
 *
 * The fix is not a better disabled colour, it is not being disabled at rest.
 * The CTA is always the solid electric pill with a white label; pressing it
 * with an incomplete field returns a message that says what is missing and
 * what to do about it. The only state that still greys it out is the genuine
 * one: the request is already in flight and a second press would double-post.
 */
const CTA = 'btn-primary btn-lg font-bold';
const CTA_BUSY = 'disabled:bg-ink-100 disabled:text-ink-300';

/*
 * ...and its WIDTH. Full-bleed on a phone, where a thumb-wide target is the
 * whole point, and hugging its own label from `sm` up. A 448px-wide slab of
 * electric blue outweighs the serif headline it is meant to serve; a pill the
 * width of the word "Continue" reads as an action instead of a banner.
 */
const CTA_HUG = 'w-full sm:w-auto';

function sanitizeInitial(value: string) {
  try {
    return normalizeSubdomainCandidate(value || '');
  } catch {
    return '';
  }
}
function parseModules(value: string | null) {
  if (!value) return new Set<string>();
  const valid = new Set(MODULES.map((m) => m.key));
  return new Set(value.split(',').filter((k) => valid.has(k)));
}

export default function SignupForm({ locale }: { locale: Locale }) {
  const t = useTranslations(locale);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ companyName: '', subdomain: '', email: '' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subStatus, setSubStatus] = useState<null | 'checking' | 'available' | 'taken' | 'unknown'>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setForm((f) => ({ ...f, subdomain: sanitizeInitial(p.get('subdomain') || '') }));
    setSelected(parseModules(p.get('modules')));
  }, []);

  useEffect(() => {
    if (!form.subdomain || form.subdomain.length < 3) {
      setSubStatus(null);
      return;
    }
    setSubStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const { available } = await checkSubdomainAvailability(form.subdomain);
        setSubStatus(available ? 'available' : 'taken');
      } catch {
        setSubStatus('unknown');
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [form.subdomain]);

  const update = (field: string, value: string) => {
    /* Typing is the user answering the message, so the message goes away as
       soon as they start. It never sits there contradicting a fixed field. */
    setError('');
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === 'companyName' || field === 'subdomain') next.subdomain = sanitizeInitial(field === 'companyName' ? value : value);
      return next;
    });
  };
  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const total = MODULES.filter((m) => selected.has(m.key)).reduce((s, m) => s + m.price, 0);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);

  /* Validation happens on the press, not on every keystroke, so nothing is
     marked wrong before the user has finished saying it. Each branch names the
     specific problem and the specific next move. */
  function goToAccount() {
    if (!form.companyName.trim()) return setError(t('signup.errors.companyRequired'));
    if (!form.subdomain) return setError(t('signup.errors.companyLetters'));
    if (subStatus === 'taken') return setError(t('signup.errors.subdomainTaken'));
    if (subStatus === 'checking') return setError(t('signup.errors.subdomainChecking'));
    setError('');
    setStep(2);
  }

  function goToModules() {
    if (!form.email.trim()) return setError(t('signup.errors.emailRequired'));
    if (!emailOk) return setError(t('signup.errors.emailInvalid'));
    setError('');
    setStep(3);
  }

  function goBack(to: number) {
    setError('');
    setStep(to);
  }

  async function handlePayment() {
    setLoading(true);
    setError('');
    try {
      const safe = normalizeSubdomainCandidate(form.subdomain);
      const data = await initiateSignup({
        tenantId: safe,
        companyName: form.companyName.trim(),
        email: form.email.trim(),
        ownerName: form.companyName.trim(),
        planId: 'starter',
        modules: [...selected],
      });
      if (!data?.success) {
        setError(data.message || t('signup.errors.generic'));
        setLoading(false);
        return;
      }
      try {
        sessionStorage.setItem('pnp_signup_tenant', safe);
      } catch {}
      if (data.free && data.workspaceUrl) {
        window.location.href = isTrustedRedirectUrl(data.workspaceUrl)
          ? data.workspaceUrl + `?email=${encodeURIComponent(form.email.trim())}`
          : `https://${safe}.paperandpen.om/login?email=${encodeURIComponent(form.email.trim())}`;
        return;
      }
      if (!isTrustedRedirectUrl(data.paymentUrl)) {
        setError(t('signup.errors.gateway'));
        setLoading(false);
        return;
      }
      window.location.href = data.paymentUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('signup.errors.network'));
      setLoading(false);
    }
  }

  /* The error surface. A tinted panel does wash out on the cream ground, so it
     stays a white card — but carried by a full hairline rather than a thick rule
     on one edge. The thick edge read as decoration and broke the flatness the
     rest of the page commits to; nothing else in this design has a side accent.
     The icon is the part that actually earns its place: it adds a cue that is
     not colour, which a red stripe next to red text never did. Flex + gap
     mirrors for ar / ur with no second rule. */
  const errorBox = error ? (
    <div
      role="alert"
      className="mt-8 flex items-start gap-3 rounded-xl border border-red-300 bg-white px-5 py-4"
    >
      <svg
        className="mt-0.5 h-5 w-5 shrink-0 text-red-700"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 5a1 1 0 012 0v5a1 1 0 01-2 0V5zm1 10a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z"
          clipRule="evenodd"
        />
      </svg>
      <p className="text-sm font-semibold leading-relaxed text-red-800">{error}</p>
    </div>
  ) : null;

  const steps = [t('signup.progress.workspace'), t('signup.progress.account'), t('signup.progress.modulesPayment')];

  return (
    <div className="w-full">
      {/*
       * THE MEASURE.
       *
       * The form column used to be `minmax(0,1fr)`, so it took whatever was
       * left of the container — about 650px at 1440, and wider still on a big
       * monitor. A single company-name field stretched across all of it, which
       * turned a 56px control into a long shallow trough, and the Continue pill
       * stretched with it into a blue slab wider than the headline above it.
       *
       * The column is now a fixed 28rem / 448px reading measure. The shell in
       * signup.astro is sized to exactly this grid (28 + 4 + 19 = 51rem), so
       * the tracks fill it with no slack and the logo, the field and the footer
       * line all share one left margin; `lg:justify-center` below is left in as
       * a guard in case that shell ever widens again.
       *
       * Below `lg` the shell itself narrows to the same 28rem, so the layout is
       * one column, the field is 448px at a tablet instead of the 816px trough
       * it used to become, and the rail simply stacks underneath. Under 448px
       * (a phone) the field goes edge to edge, which is what it should do.
       */}
      <div className="grid items-start gap-10 lg:grid-cols-[28rem_19rem] lg:justify-center lg:gap-16">
        {/* ---------------------------------------------------------------
         * THE FORM COLUMN
         * ------------------------------------------------------------- */}
        <div className="min-w-0">
          {/* Progress. The filled track carries the state; the labels stay at
              full ink and separate by WEIGHT, never by being lightened. */}
          <nav aria-label={t('signup.title')} className="mb-10">
            <ol className="grid grid-cols-3 gap-2 sm:gap-3">
              {steps.map((label, i) => {
                const n = i + 1;
                const active = n === step;
                return (
                  <li key={label} className="min-w-0" aria-current={active ? 'step' : undefined}>
                    <span
                      className={`block h-1 rounded-pill ${n <= step ? 'bg-electric-500' : 'bg-ink-100'}`}
                    />
                    {/* NOT truncated. `truncate` rendered the third and final
                        step of a money signup as "Modules & Payme…" at 390px —
                        the word Payment, unreadable, on the device most people
                        sign up from. It wraps to two lines instead.

                        And state is carried by COLOUR, not weight alone: at
                        12px a medium/bold difference is not a state signal.
                        The current step holds full navy, steps not yet reached
                        drop to the quiet ink (still AA at 4.88:1). */}
                    <span
                      className={`mt-2.5 block text-xs leading-tight ${
                        active ? 'font-bold text-ink-500' : n < step ? 'font-medium text-ink-500' : 'font-medium text-ink-300'
                      }`}
                    >
                      {label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </nav>

          {/* ---------------- STEP 1 — workspace ---------------- */}
          {step === 1 && (
            <div>
              <h1 className="display-3">{t('signup.step1.title')}</h1>
              <p className="lede mt-3">{t('signup.step1.subtitle')}</p>

              <div className="mt-9">
                <label className={LABEL} htmlFor="pnp-company">
                  {t('signup.step1.label')}
                </label>
                <input
                  id="pnp-company"
                  name="company"
                  autoComplete="organization"
                  className={subStatus === 'taken' ? FIELD_BAD : FIELD_OK}
                  aria-invalid={subStatus === 'taken' || undefined}
                  aria-describedby={form.subdomain ? 'pnp-workspace-url' : undefined}
                  value={form.companyName}
                  onChange={(e) => update('companyName', e.target.value)}
                  placeholder={t('signup.step1.placeholder')}
                  autoFocus
                />
              </div>

              {form.subdomain && (
                <div
                  id="pnp-workspace-url"
                  className="mt-4 rounded-xl border border-paper-300 bg-white px-5 py-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">
                    {t('signup.step1.subdomainLabel')}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="break-all font-mono text-base font-semibold text-ink-500" dir="ltr">
                      {form.subdomain}
                      {t('hero.subdomainSuffix')}
                    </span>
                    {subStatus === 'checking' && (
                      <span className="text-xs font-semibold text-ink-500">{t('signup.step1.checking')}</span>
                    )}
                    {subStatus === 'available' && (
                      <span className="rounded-pill bg-mint-100 px-3 py-1 text-xs font-bold text-mint-900">
                        {t('signup.step1.available')}
                      </span>
                    )}
                    {subStatus === 'taken' && (
                      <span className="rounded-pill bg-red-100 px-3 py-1 text-xs font-bold text-red-800">
                        {t('signup.step1.taken')}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {errorBox}

              <button type="button" onClick={goToAccount} className={`${CTA} ${CTA_HUG} ${error ? 'mt-4' : 'mt-8'}`}>
                {t('signup.step1.next')}
                <Arrow />
              </button>
            </div>
          )}

          {/* ---------------- STEP 2 — account ---------------- */}
          {step === 2 && (
            <div>
              <h1 className="display-3">{t('signup.step2.title')}</h1>
              <p className="lede mt-3">{t('signup.step2.subtitle')}</p>

              <div className="mt-9">
                <label className={LABEL} htmlFor="pnp-email">
                  {t('signup.step2.emailLabel')}
                </label>
                <input
                  id="pnp-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className={FIELD_OK}
                  dir="ltr"
                  aria-describedby="pnp-email-hint"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder={t('signup.step2.emailPlaceholder')}
                  autoFocus
                />
                <p id="pnp-email-hint" className="mt-2.5 text-sm text-ink-500">
                  {t('signup.step2.emailHint')}
                </p>
              </div>

              {errorBox}

              {/* `flex-row-reverse` + `justify-end` packs the pair against the
                  inline-start edge with the primary on the outside, and mirrors
                  itself for ar / ur. Neither button carries `flex-1` any more:
                  they size to their labels rather than splitting the measure. */}
              <div
                className={`flex flex-col gap-3 sm:flex-row-reverse sm:justify-end ${
                  error ? 'mt-4' : 'mt-8'
                }`}
              >
                <button type="button" onClick={goToModules} className={CTA}>
                  {t('signup.step2.next')}
                  <Arrow />
                </button>
                <button type="button" onClick={() => goBack(1)} className="btn-secondary btn-lg">
                  {t('signup.step2.back')}
                </button>
              </div>
            </div>
          )}

          {/* ---------------- STEP 3 — modules & payment ---------------- */}
          {step === 3 && (
            <div>
              <h1 className="display-3">{t('signup.step3.title')}</h1>
              <p className="lede mt-3">{t('signup.step3.subtitle')}</p>

              {/* The "Sales & Invoicing is free" card that used to sit here was
                  a navy slab repeating what the subtitle, the rail and the
                  Base row of the summary all already say. Dropped: the module
                  list now starts straight after the heading. */}
              <div className="mt-9 space-y-3">
                {MODULES.map(({ key, price }) => {
                  const active = selected.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggle(key)}
                      aria-pressed={active}
                      className={`flex w-full items-center justify-between gap-4 rounded-card border-2 px-5 py-4 text-start transition-colors duration-150 ${
                        active
                          ? 'border-electric-500 bg-electric-50'
                          : 'border-paper-300 bg-white hover:border-ink-200'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-3.5">
                        <span
                          aria-hidden="true"
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
                            active ? 'border-electric-500 bg-electric-500' : 'border-ink-200 bg-white'
                          }`}
                        >
                          {active && (
                            <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        <span className="truncate font-semibold text-ink-500">{t(`modules.${key}.title`)}</span>
                      </span>
                      <span
                        dir="ltr"
                        className={`shrink-0 text-sm font-bold ${active ? 'text-electric-500' : 'text-ink-500'}`}
                      >
                        {t('modules.pricePerMonth', { price })}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Order summary. Kept beside the CTA rather than in the rail —
                  it is the decision being made, not standing context. */}
              <div className="mt-6 rounded-card border border-paper-300 bg-white px-5 py-4">
                <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
                  <span className="text-ink-500">{t('signup.step3.baseRow')}</span>
                  <span className="font-semibold text-emerald-500">{t('signup.step3.baseValue')}</span>
                </div>
                {total > 0 && (
                  <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
                    <span className="text-ink-500">{t('signup.step3.addonsLabel')}</span>
                    <span className="font-semibold text-ink-500" dir="ltr">
                      {total} {t('modules.omr_mo')}
                    </span>
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between gap-4 border-t border-paper-300 pt-3">
                  <span className="font-semibold text-ink-500">{t('signup.step3.dueToday')}</span>
                  <span className="font-display text-2xl font-semibold text-electric-500" dir="ltr">
                    0.000 OMR
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-500">
                  {total > 0 ? t('signup.step3.paidNote', { total }) : t('signup.step3.freeNote')}
                </p>
              </div>

              {errorBox}

              <div
                className={`flex flex-col gap-3 sm:flex-row-reverse sm:justify-end ${
                  error ? 'mt-4' : 'mt-8'
                }`}
              >
                {/* The one place the greyed treatment is honest: the request is
                    already away and a second press would create a second
                    workspace. Everywhere else the pill stays electric. */}
                <button
                  type="button"
                  onClick={handlePayment}
                  disabled={loading}
                  className={`${CTA} ${CTA_BUSY}`}
                >
                  {loading ? (
                    <>
                      <span
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                      />
                      {t('signup.step3.btnLoading')}
                    </>
                  ) : total > 0 ? (
                    t('signup.step3.btnPaid')
                  ) : (
                    t('signup.step3.btnFree')
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => goBack(2)}
                  disabled={loading}
                  className="btn-secondary btn-lg disabled:border-ink-200 disabled:text-ink-300 disabled:hover:bg-transparent disabled:hover:text-ink-300"
                >
                  {t('signup.step3.back')}
                </button>
              </div>

              <p className="mt-5 text-sm text-ink-500">
                {total > 0 ? t('signup.step3.footerPaid') : t('signup.step3.footerFree')}
              </p>
            </div>
          )}
        </div>

        {/* ---------------------------------------------------------------
         * THE RAIL — standing context, identical on every step. Flat pale-blue
         * fill, no shadow, no border. ink on tint-blue is 13.8 : 1.
         *
         * IT CARRIES THE BAND. This was 308px tall against a 421px form
         * column, so it stopped 113px short of the Continue button and left the
         * bottom-right quadrant of the fold as a hole — the single thing the
         * last critic named. The fix is mass, not a stretched empty panel: the
         * rail runs to roughly the CTA baseline because it has more to say, not
         * because it was padded.
         *
         * WHAT it says was the next gap, and it is the harder one. The rows
         * were marketing stats lifted off the home page, and the closing line
         * was the home page's pre-footer paragraph, which restated the FREE
         * chip and the setup-time row already visible in the same panel. So
         * three of five rows said something twice and two said nothing anyone
         * decides on. See FACTS at the top of this file for what replaced them:
         * the rail now only carries facts a person weighs with their hand on
         * the button, and it closes on the one thing nothing else here says.
         *
         * Label left, value right, hairline between: the same row shape the
         * pricing card uses. No icons and no accent on any of it — the accent
         * is spent on the CTA and the links, which is the one rule the bar
         * never breaks.
         * ------------------------------------------------------------- */}
        <aside className="rounded-card bg-tint-blue px-7 py-7 lg:sticky lg:top-10">
          <p className="eyebrow-ink">{t('modules.included')}</p>
          <p className="mt-4 font-display text-2xl font-semibold leading-tight text-ink-500">
            {t('signup.step3.baseTitle')}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">{t('signup.step3.baseSub')}</p>
          <span className="mt-4 inline-block rounded-pill bg-mint-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-mint-900">
            {t('signup.step3.baseTag')}
          </span>

          <div className="my-6 h-px bg-white" />

          {/* `justify-between` mirrors itself under dir="rtl", so ar / ur put
              the label on the right and the value on the left with no second
              rule. The value never gets a forced dir: "أي" and "কোনো" are real
              words in those locales, not Latin data. */}
          <dl className="space-y-3">
            {FACTS.map(({ label, value }, i) => (
              <div
                key={label}
                className={`flex items-baseline justify-between gap-4 ${
                  i > 0 ? 'border-t border-white pt-3' : ''
                }`}
              >
                <dt className="min-w-0 text-sm leading-snug text-ink-500">{t(label)}</dt>
                <dd className="shrink-0 text-sm font-bold text-ink-500">{t(value)}</dd>
              </div>
            ))}
          </dl>

          <div className="my-6 h-px bg-white" />

          {/* The closing line used to be `cta.sub`, the home page's pre-footer
              paragraph: "Create your free workspace in under 5 minutes. Sales &
              Invoicing is free forever, no credit card required." Inside THIS
              panel every clause of it was already on screen — the FREE chip two
              inches above, the setup-time row directly above, and the card row
              directly above that — so the rail closed by repeating itself three
              times. It now closes on the one thing nothing else here says: what
              actually happens to the workspace when you stop paying. */}
          <p className="text-sm leading-relaxed text-ink-500">{t('signup.rail.note')}</p>
        </aside>
      </div>
    </div>
  );
}

/* Forward arrow. Mirrored for ar / ur so it never points back at the user. */
function Arrow() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 shrink-0 rtl:rotate-180"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7l7 7-7 7" />
    </svg>
  );
}
