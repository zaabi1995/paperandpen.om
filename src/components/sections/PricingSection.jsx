import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';
const PLANS = ['starter', 'growth', 'business'];
const POPULAR = 'growth';
export default function PricingSection() {
  const { t } = useI18n();
  const [annual, setAnnual] = useState(false);
  return (
    <section id="pricing" className="py-20 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">{t('pricing.title')}</h2>
          <p className="text-gray-500 mb-8">{t('pricing.sub')}</p>
          <div className="inline-flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm gap-1">
            <button onClick={() => setAnnual(false)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${!annual ? 'bg-brand-500 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}>{t('pricing.monthly')}</button>
            <button onClick={() => setAnnual(true)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${annual ? 'bg-brand-500 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}>
              {t('pricing.annual')} <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${annual ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-600'}`}>-20%</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {PLANS.map((key) => {
            const plan = t(`pricing.${key}`);
            const price = annual ? plan.price_annual : plan.price_monthly;
            const suffix = annual ? t('pricing.perYear') : t('pricing.perMonth');
            const isPopular = key === POPULAR;
            return (
              <div key={key} className={`relative bg-white rounded-2xl border shadow-sm p-6 flex flex-col ${isPopular ? 'border-brand-500 shadow-lg ring-2 ring-brand-500/20' : 'border-gray-200 hover:shadow-md'}`}>
                {isPopular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-full">{t('pricing.mostPopular')}</div>}
                <h3 className="text-lg font-bold text-gray-900 mb-1">{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-extrabold text-gray-900">{price}</span>
                  <span className="text-sm text-gray-400">OMR{suffix}</span>
                </div>
                <ul className="space-y-2 mb-8 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <svg className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to={`/signup?plan=${key}&billing=${annual ? 'annual' : 'monthly'}`}
                  className={`block text-center py-2.5 px-4 rounded-xl font-semibold text-sm transition-all ${isPopular ? 'bg-brand-500 text-white hover:bg-brand-600' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}>
                  {t('pricing.startTrial')}
                </Link>
              </div>
            );
          })}
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h4 className="font-semibold text-gray-900 mb-4">{t('pricing.addons.title')}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {['whatsapp', 'extraUsers', 'extraStorage'].map((addon) => (
              <div key={addon} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="text-brand-500 font-bold">+</span>{t(`pricing.addons.${addon}`)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
