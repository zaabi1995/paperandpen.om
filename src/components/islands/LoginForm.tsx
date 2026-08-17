import { useState, useEffect } from 'react';
import { normalizeSubdomainCandidate } from '@/lib/api';
import { useTranslations, localizePath, type Locale } from '@/i18n';

/* Same field language as SignupForm: tall, white, soft hairline, electric
   focus ring. See the note there for why each value is what it is. */
const FIELD =
  'w-full h-14 rounded-xl border bg-white px-5 text-base text-ink-500 ' +
  'placeholder:text-ink-300 outline-none transition-colors duration-150 ' +
  'focus:ring-4 focus:ring-electric-100';
const FIELD_OK = `${FIELD} border-ink-200 focus:border-electric-500`;
const LABEL = 'mb-2 block text-sm font-semibold text-ink-500';

export default function LoginForm({ locale }: { locale: Locale }) {
  const t = useTranslations(locale);
  const [workspace, setWorkspace] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('email')) setEmail(p.get('email')!);
    try {
      const last = sessionStorage.getItem('pnp_signup_tenant') || sessionStorage.getItem('pnp_last_workspace');
      if (last) setWorkspace(last);
    } catch {}
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    let ws = '';
    try {
      ws = normalizeSubdomainCandidate(workspace);
    } catch {
      ws = '';
    }
    if (!ws || ws.length < 3) {
      setError(t('login.workspaceError'));
      return;
    }
    try {
      sessionStorage.setItem('pnp_last_workspace', ws);
    } catch {}
    window.location.href = `https://${ws}.paperandpen.om/login/code?email=${encodeURIComponent(email.trim())}`;
  }

  return (
    /* 28rem, the same measure as a signup step. The page shell already caps at
       max-w-md; this keeps the island honest if it is ever dropped elsewhere. */
    <div className="mx-auto w-full max-w-md">
      <h1 className="display-3">{t('login.title')}</h1>
      <p className="lede mt-3">{t('login.subtitle')}</p>

      <form onSubmit={submit} noValidate className="mt-9 space-y-6">
        <div>
          <label className={LABEL} htmlFor="pnp-workspace">
            {t('login.workspace')}
          </label>
          {/* The workspace + suffix pair is one control. It is forced to LTR in
              every locale because a hostname reads left-to-right even in
              ar / ur; `border-s` then lands on the correct edge on its own. */}
          <div
            dir="ltr"
            className={`flex h-14 items-stretch overflow-hidden rounded-xl border bg-white transition-colors duration-150 ${
              error
                ? 'border-red-600 focus-within:ring-4 focus-within:ring-red-100'
                : 'border-ink-200 focus-within:border-electric-500 focus-within:ring-4 focus-within:ring-electric-100'
            }`}
          >
            <input
              id="pnp-workspace"
              name="workspace"
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value)}
              placeholder={t('hero.subdomainPlaceholder')}
              className="min-w-0 flex-1 bg-transparent px-5 text-base text-ink-500 outline-none placeholder:text-ink-300"
              autoComplete="organization"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'pnp-login-error' : undefined}
              required
              autoFocus
            />
            <span className="flex select-none items-center border-s border-paper-300 bg-paper-200 px-4 text-sm font-medium text-ink-500">
              {t('hero.subdomainSuffix')}
            </span>
          </div>
        </div>

        <div>
          <label className={LABEL} htmlFor="pnp-login-email">
            {t('login.email')}
          </label>
          <input
            id="pnp-login-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('signup.step2.emailPlaceholder')}
            className={FIELD_OK}
            dir="ltr"
            required
          />
        </div>

        {error && (
          <div
            id="pnp-login-error"
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-300 bg-white px-5 py-4"
          >
            {/* Icon, not a side stripe: it adds a cue that is not colour, which
                a red rule beside red text never did, and it keeps the flatness
                the rest of the page commits to. Mirrors for ar / ur via flex. */}
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
        )}

        {/*
          Never disabled at rest: an empty field is answered by the message
          above, not by a pale pill that reads broken. Same rule as signup.

          AND IT HUGS ITS LABEL. This carried `btn-block`, so on desktop it
          stretched to the full 448px measure and became a solid electric slab
          the width of both fields stacked above it, the loudest object on a
          page whose whole job is two inputs. The bar never does that: its
          actions are compact pills that size to their words. So it is only
          full-bleed below `sm`, where a thumb-wide target is the point, and
          hugs from `sm` up. This is the same `w-full sm:w-auto` the signup
          step uses, so the two auth pages now share one action shape.
        */}
        <button type="submit" className="btn-primary btn-lg w-full font-bold sm:w-auto">
          {t('login.submit')}
          <svg
            aria-hidden="true"
            className="h-4 w-4 shrink-0 rtl:rotate-180"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7l7 7-7 7" />
          </svg>
        </button>
      </form>

      <p className="mt-5 text-sm leading-relaxed text-ink-500">{t('login.otpNote')}</p>

      <div className="mt-8 border-t border-paper-300 pt-6">
        {/* `inline-block py-1` takes this link from 94x18 to 94x26. WCAG 2.5.8
            does exempt a link sitting inside a sentence, but the exemption is a
            licence to be small, not a reason to be — and 18px is below the
            comfortable-thumb line on the one page a returning user taps in a
            hurry. The padding is vertical only, so the sentence still reads as
            one line and the baseline does not move. */}
        <p className="text-sm text-ink-500">
          {t('login.noAccount')}{' '}
          <a className="link inline-block py-1 font-semibold" href={localizePath('/signup', locale)}>
            {t('login.signUp')}
          </a>
        </p>
      </div>
    </div>
  );
}
