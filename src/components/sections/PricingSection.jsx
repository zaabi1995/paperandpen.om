import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';

const MODULES = [
  { key: 'sales',         price: 0,  included: true },
  { key: 'inventory',     price: 5,  included: false },
  { key: 'hr',            price: 8,  included: false },
  { key: 'accounting',    price: 8,  included: false },
  { key: 'manufacturing', price: 10, included: false },
  { key: 'reports',       price: 5,  included: false },
];

export default function PricingSection() {
  const { t } = useI18n();
  const [selected, setSelected] = useState(new Set());

  const toggle = (key) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const total = MODULES.filter(m => selected.has(m.key)).reduce((s, m) => s + m.price, 0);
  const modulesParam = [...selected].join(',');
  const signupHref = `/signup${modulesParam ? `?modules=${modulesParam}` : ''}`;

  return (
    <section id="pricing" className="py-24 px-6 lg:px-10 bg-cream-50">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="max-w-2xl mb-14">
          <p className="text-xs font-semibold text-copper-400 tracking-widest uppercase mb-3">{t('pricing.eyebrow')}</p>
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-ink-500 leading-tight mb-4">
            {t('pricing.title')}
          </h2>
          <p className="text-ink-500/60 text-lg">{t('pricing.sub')}</p>
        </div>

        {/* Free base callout */}
        <div className="bg-ink-500 rounded-2xl p-7 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold bg-white/20 text-cream-100 px-2.5 py-1 rounded-full tracking-wide uppercase mb-3 inline-block">{t('pricing.free_label')}</span>
            <h3 className="font-display text-2xl font-bold text-cream-50 mb-1">{t('pricing.base.title')}</h3>
            <p className="text-cream-100/70 text-sm">{t('pricing.base.desc')}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="font-display text-5xl font-bold text-cream-50 leading-none">0</div>
            <div className="text-cream-100/60 text-sm mt-1">{t('pricing.perMonth')}</div>
          </div>
        </div>

        {/* Module picker */}
        <p className="text-sm font-semibold text-ink-400 uppercase tracking-widest mb-4">{t('pricing.addModules')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {MODULES.filter(m => !m.included).map(({ key, price }) => {
            const active = selected.has(key);
            return (
              <button
                key={key}
                onClick={() => toggle(key)}
                className={`text-left p-5 rounded-2xl border-2 transition-all ${
                  active
                    ? 'border-copper-400 bg-copper-50'
                    : 'border-cream-200 bg-white hover:border-ink-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-ink-500 text-sm">{t(`modules.${key}.title`)}</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${active ? 'border-copper-400 bg-copper-400' : 'border-cream-300 bg-white'}`}>
                    {active && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                </div>
                <p className="text-xs text-ink-400 mb-3">{t(`modules.${key}.desc`)}</p>
                <p className={`text-sm font-bold ${active ? 'text-copper-500' : 'text-ink-300'}`}>+{price} {t('modules.omrPerMonth')}</p>
              </button>
            );
          })}
        </div>

        {/* Total + CTA */}
        <div className="bg-white border-2 border-cream-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-xs font-semibold text-ink-300 uppercase tracking-widest mb-1">{t('modules.estimateLabel')}</p>
            <div className="flex items-baseline gap-2">
              {total === 0 ? (
                <span className="font-display text-4xl font-bold text-ink-500">{t('pricing.free_label')}</span>
              ) : (
                <>
                  <span className="font-display text-4xl font-bold text-ink-500">{total}</span>
                  <span className="text-ink-400 font-medium">{t('modules.omr_mo')}</span>
                </>
              )}
            </div>
            <p className="text-xs text-ink-300 mt-1">{t('pricing.trialNote')}</p>
          </div>
          <Link
            to={signupHref}
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-ink-500 text-cream-50 font-semibold rounded-xl hover:bg-ink-700 transition-all shadow-md whitespace-nowrap"
          >
            {t('pricing.startTrial')}
          </Link>
        </div>
      </div>
    </section>
  );
}
