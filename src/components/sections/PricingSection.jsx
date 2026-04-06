import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';

const PLANS = ['starter', 'growth', 'enterprise'];
const HIGHLIGHT = 'growth';

export default function PricingSection() {
  const { t } = useI18n();
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-24 px-6 lg:px-10 bg-cream-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="max-w-2xl mb-14">
          <p className="text-xs font-semibold text-copper-400 tracking-widest uppercase mb-3">{t('pricing.eyebrow')}</p>
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-ink-500 leading-tight mb-4">
            {t('pricing.title')}
          </h2>
          <p className="text-ink-500/60 text-lg">{t('pricing.sub')}</p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center gap-3 mb-12">
          <span className={`text-sm font-semibold ${!annual ? 'text-ink-500' : 'text-ink-300'}`}>{t('pricing.monthly')}</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-ink-500' : 'bg-cream-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${annual ? 'translate-x-6' : ''}`} />
          </button>
          <span className={`text-sm font-semibold ${annual ? 'text-ink-500' : 'text-ink-300'}`}>{t('pricing.annual')}</span>
          {annual && (
            <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">{t('pricing.annualSave')}</span>
          )}
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14 items-start">
          {PLANS.map((key) => {
            const plan = t(`pricing.${key}`);
            const price = annual ? plan.price_annual : plan.price_monthly;
            const suffix = annual ? t('pricing.perYear') : t('pricing.perMonth');
            const isHighlight = key === HIGHLIGHT;

            return (
              <div
                key={key}
                className={`relative flex flex-col rounded-2xl p-7 border-2 transition-all ${
                  isHighlight
                    ? 'border-ink-500 bg-ink-500 shadow-2xl shadow-ink-500/25 md:-mt-4 md:pb-11'
                    : 'border-cream-200 bg-white hover:border-ink-200 hover:shadow-lg'
                }`}
              >
                {isHighlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-copper-400 text-white text-xs font-bold px-4 py-1.5 rounded-full tracking-wide uppercase shadow-md whitespace-nowrap">
                    {t('pricing.mostPopular')}
                  </div>
                )}

                <h3 className={`font-display text-xl font-bold mb-1 ${isHighlight ? 'text-cream-50' : 'text-ink-500'}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm mb-6 ${isHighlight ? 'text-cream-100/70' : 'text-ink-400'}`}>
                  {plan.description}
                </p>

                <div className="flex items-baseline gap-1 mb-8">
                  <span className={`font-display text-5xl font-bold leading-none ${isHighlight ? 'text-cream-50' : 'text-ink-500'}`}>
                    {price}
                  </span>
                  <span className={`text-sm font-medium ml-1 ${isHighlight ? 'text-cream-100/60' : 'text-ink-300'}`}>
                    OMR{suffix}
                  </span>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className={`flex items-start gap-2.5 text-sm ${isHighlight ? 'text-cream-100' : 'text-ink-400'}`}>
                      <svg className={`w-4 h-4 mt-0.5 shrink-0 ${isHighlight ? 'text-copper-300' : 'text-copper-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  to={`/signup?plan=${key}&billing=${annual ? 'annual' : 'monthly'}`}
                  className={`block text-center py-3 px-5 rounded-xl font-semibold text-sm transition-all ${
                    isHighlight
                      ? 'bg-copper-400 text-white hover:bg-copper-500 shadow-lg'
                      : 'bg-ink-50 text-ink-500 border-2 border-ink-200 hover:bg-ink-500 hover:text-cream-50 hover:border-ink-500'
                  }`}
                >
                  {t('pricing.startTrial')}
                </Link>
              </div>
            );
          })}
        </div>

        {/* Add-ons */}
        <div className="bg-white border border-cream-200 rounded-2xl p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h4 className="font-display text-lg font-semibold text-ink-500 mb-1">{t('pricing.addons.title')}</h4>
              <p className="text-sm text-ink-400">{t('pricing.addons.subtitle')}</p>
            </div>
            <a href="#modules" className="text-sm font-semibold text-copper-500 hover:text-copper-600 flex items-center gap-1 whitespace-nowrap">
              {t('pricing.buildYourOwn')}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { key: 'whatsapp', price: '5' },
              { key: 'extraUsers', price: '3' },
              { key: 'extraStorage', price: '5' },
            ].map(({ key, price }) => (
              <div key={key} className="flex items-center gap-3 bg-cream-50 rounded-xl p-4 border border-cream-100">
                <div className="w-8 h-8 rounded-lg bg-copper-400/15 flex items-center justify-center text-copper-500 font-bold text-sm shrink-0">+</div>
                <div>
                  <p className="text-sm font-semibold text-ink-500">{t(`pricing.addons.${key}_name`)}</p>
                  <p className="text-xs text-ink-300">{t(`pricing.addons.${key}_desc`, { price })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-ink-300 mt-6">{t('pricing.trialNote')}</p>
      </div>
    </section>
  );
}
