import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';
import { slugifySubdomain } from '@/lib/utils';

export default function HeroSection() {
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [status, setStatus] = useState('idle');
  const timerRef = useRef(null);

  useEffect(() => {
    const slug = slugifySubdomain(input);
    setSubdomain(slug);
    if (!slug) { setStatus('idle'); return; }
    setStatus('checking');
    clearTimeout(timerRef.current);
    // Simulate availability check (real API not yet deployed)
    timerRef.current = setTimeout(() => setStatus('available'), 600);
    return () => clearTimeout(timerRef.current);
  }, [input]);

  const statusColor = { available: 'text-green-600', taken: 'text-red-500', checking: 'text-gray-400', idle: '' }[status];
  const statusText = { available: t('hero.available', { subdomain }), taken: t('hero.taken', { subdomain }), checking: t('hero.checking'), idle: '' }[status];
  const signupLink = subdomain ? `/signup?subdomain=${subdomain}` : '/signup';

  return (
    <section className="relative bg-gradient-to-br from-brand-50 via-white to-amber-100 py-20 sm:py-28 px-4 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/5 rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-400/10 rounded-full -translate-x-1/2 translate-y-1/2" />
      </div>
      <div className="relative max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-brand-500/10 text-brand-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <span>🌍</span><span>Made in the GCC, for the GCC</span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
          {t('hero.tagline')}
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10">{t('hero.sub')}</p>
        <div className="max-w-lg mx-auto mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2 text-start">{t('hero.subdomainLabel')}</label>
          <div className="flex items-stretch rounded-xl border border-gray-300 bg-white shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 overflow-hidden">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('hero.subdomainPlaceholder')}
              className="flex-1 px-4 py-3 text-gray-900 placeholder-gray-400 text-sm outline-none bg-transparent"
              maxLength={50}
            />
            <span className="flex items-center px-3 bg-gray-50 text-gray-500 text-sm border-l border-gray-200 select-none">
              {t('hero.subdomainSuffix')}
            </span>
          </div>
          {statusText && <p className={`text-xs mt-1.5 ${statusColor}`}>{statusText}</p>}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <Link to={signupLink} className="px-6 py-3 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-all shadow-md hover:shadow-lg">
            {t('hero.cta')}
          </Link>
          <a href="#pricing" className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all">
            {t('nav.pricing')}
          </a>
        </div>
        <p className="mt-4 text-xs text-gray-400">14-day free trial · No credit card required to start · Cancel anytime</p>
      </div>
    </section>
  );
}
