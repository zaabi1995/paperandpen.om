import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';
import { checkSubdomainAvailability } from '@/lib/api';
import { MAX_SUBDOMAIN_LENGTH, sanitizeSubdomainInput } from '@/lib/utils';

export default function HeroSection() {
  const { t, lang } = useI18n();
  const [input, setInput] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [status, setStatus] = useState('idle');
  const [checkerError, setCheckerError] = useState('');
  const timerRef = useRef(null);
  const isRTL = lang === 'ar';

  useEffect(() => {
    const slug = sanitizeSubdomainInput(input);
    setSubdomain(slug);
    setCheckerError('');
    if (!slug) {
      setStatus('idle');
      return;
    }
    setStatus('checking');
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const { available } = await checkSubdomainAvailability(slug);
        setStatus(available ? 'available' : 'taken');
      } catch {
        setStatus('idle');
        setCheckerError(t('hero.subdomainError') || 'Unable to verify this workspace right now.');
      }
    }, 600);
    return () => clearTimeout(timerRef.current);
  }, [input, t]);

  const signupLink = subdomain ? `/signup?subdomain=${subdomain}` : '/signup';

  return (
    <section className="relative overflow-hidden bg-cream-50 min-h-[92vh] flex items-center" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Paper texture overlay */}
      <div className="absolute inset-0 bg-paper-texture opacity-100 pointer-events-none" />

      {/* Decorative ink bleed — top right */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-ink-500/5 blur-3xl" />
        <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-copper-300/10 blur-2xl" />
      </div>
      {/* Decorative — bottom left */}
      <div className="absolute bottom-0 left-0 w-96 h-96 pointer-events-none">
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-cream-300/40 blur-3xl" />
      </div>

      {/* Vertical rule — editorial detail */}
      <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-ink-200/60 to-transparent hidden lg:block" />

      <div className="relative max-w-6xl mx-auto px-6 lg:px-10 py-24 grid lg:grid-cols-2 gap-16 items-center w-full">
        {/* Left: copy */}
        <div>
          <div className="inline-flex items-center gap-2 border border-copper-300/40 bg-copper-300/10 text-copper-500 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-8 tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-copper-400 animate-pulse" />
            {t('hero.badge')}
          </div>

          <h1 className="font-display text-5xl lg:text-6xl xl:text-7xl font-bold text-ink-500 leading-[1.08] mb-6">
            {t('hero.tagline_line1')}<br />
            <em className="text-copper-400 not-italic">{t('hero.tagline_line2')}</em>
          </h1>

          <p className="text-ink-500/60 text-lg leading-relaxed mb-10 max-w-lg">
            {t('hero.sub')}
          </p>

          {/* Subdomain input */}
          <div className="mb-3">
            <label className="block text-xs font-semibold text-ink-500/50 mb-2 tracking-widest uppercase">
              {t('hero.subdomainLabel')}
            </label>
            <div className={`flex items-stretch rounded-xl border-2 bg-white shadow-sm overflow-hidden transition-all ${
              status === 'available' ? 'border-emerald-400 shadow-emerald-100' :
              status === 'taken' ? 'border-red-400 shadow-red-100' :
              'border-cream-300 focus-within:border-ink-500 focus-within:shadow-ink-100'
            }`}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(sanitizeSubdomainInput(e.target.value, MAX_SUBDOMAIN_LENGTH))}
                placeholder={t('hero.subdomainPlaceholder')}
                className="flex-1 px-4 py-3.5 text-ink-500 placeholder-ink-200 text-sm outline-none bg-transparent font-medium"
                maxLength={50}
              />
              <span className="flex items-center px-4 bg-cream-100 text-ink-300 text-sm border-l border-cream-200 select-none font-medium whitespace-nowrap">
                {t('hero.subdomainSuffix')}
              </span>
            </div>
            <div className="h-5 mt-1.5">
              {status === 'checking' && <p className="text-xs text-ink-300">{t('hero.checking')}</p>}
              {status === 'available' && <p className="text-xs text-emerald-600 font-medium">✓ {subdomain}{t('hero.subdomainSuffix')} {t('hero.available_short')}</p>}
              {status === 'taken' && <p className="text-xs text-red-500">{subdomain}{t('hero.subdomainSuffix')} {t('hero.taken_short')}</p>}
              {checkerError && <p className="text-xs text-red-500">{checkerError}</p>}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Link
              to={signupLink}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-ink-500 text-cream-50 font-semibold rounded-xl hover:bg-ink-700 transition-all shadow-lg shadow-ink-500/20 hover:shadow-xl hover:shadow-ink-500/30 hover:-translate-y-0.5"
            >
              {t('hero.cta')}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isRTL ? "M19 12H5m7-7l-7 7 7 7" : "M5 12h14m-7-7l7 7-7 7"} />
              </svg>
            </Link>
            <a
              href="#modules"
              className="inline-flex items-center justify-center px-7 py-3.5 border-2 border-ink-200 text-ink-500 font-semibold rounded-xl hover:border-ink-500 hover:bg-ink-50 transition-all"
            >
              {t('hero.seeModules')}
            </a>
          </div>

          <p className="mt-5 text-xs text-ink-300 tracking-wide">{t('hero.trialNote')}</p>
        </div>

        {/* Right: floating stats card */}
        <div className="hidden lg:flex flex-col gap-5 items-end">
          {/* Mock ERP window */}
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl shadow-ink-500/10 border border-cream-200 overflow-hidden">
            <div className="bg-ink-500 px-5 py-3.5 flex items-center justify-between">
              <span className="text-cream-50 text-sm font-semibold font-display">{t('hero.card_title')}</span>
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cream-50/20" />
                <span className="w-2.5 h-2.5 rounded-full bg-cream-50/20" />
                <span className="w-2.5 h-2.5 rounded-full bg-copper-400" />
              </div>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: t('hero.stat1_label'), value: t('hero.stat1_value'), color: 'text-emerald-600' },
                { label: t('hero.stat2_label'), value: t('hero.stat2_value'), color: 'text-ink-500' },
                { label: t('hero.stat3_label'), value: t('hero.stat3_value'), color: 'text-copper-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between py-2.5 border-b border-cream-100 last:border-0">
                  <span className="text-xs text-ink-300 font-medium">{label}</span>
                  <span className={`text-sm font-bold ${color}`}>{value}</span>
                </div>
              ))}
            </div>
            <div className="px-5 pb-5">
              <div className="h-1.5 w-full bg-cream-100 rounded-full overflow-hidden">
                <div className="h-full w-3/4 bg-gradient-to-r from-ink-500 to-copper-400 rounded-full" />
              </div>
              <p className="text-xs text-ink-300 mt-1.5">{t('hero.card_progress')}</p>
            </div>
          </div>

          {/* Trust badge */}
          <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-md border border-cream-200 w-fit">
            <div className="flex -space-x-2">
              {['#1e2d5a','#a85f25','#2d6a4f','#7c3aed'].map((c, i) => (
                <div key={i} className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: c }}>
                  {['A','B','C','D'][i]}
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-500">{t('hero.trust_count')}</p>
              <p className="text-xs text-ink-300">{t('hero.trust_label')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce opacity-40">
        <svg className="w-5 h-5 text-ink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}
