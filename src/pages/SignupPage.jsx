import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';
import { slugifySubdomain } from '@/lib/utils';
import LangToggle from '@/components/LangToggle';

const STEPS = 4;

export default function SignupPage() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    companyName: '',
    subdomain: params.get('subdomain') || '',
    email: '',
    password: '',
    language: params.get('lang') || 'en',
    currency: 'OMR',
    plan: params.get('plan') || 'growth',
  });
  const [provisioning, setProvisioning] = useState(false);
  const [done, setDone] = useState(false);

  function update(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === 'companyName') next.subdomain = slugifySubdomain(value);
      return next;
    });
  }

  async function handleSubmit() {
    setProvisioning(true);
    // Simulate provisioning — real API integration happens when backend is deployed
    await new Promise((r) => setTimeout(r, 3000));
    setDone(true);
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-50 px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('signup.step4.title')}</h2>
          <p className="text-gray-500 mb-6">{t('signup.step4.redirect')}</p>
          <div className="space-y-2">
            {(t('signup.step4.steps') || []).map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-600 justify-center">
                <span className="text-brand-500">✓</span>{s}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-6">
            Your workspace: <strong>{form.subdomain}.paperandpen.om</strong>
          </p>
        </div>
      </div>
    );
  }

  if (provisioning) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-50 px-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t('signup.step4.title')}</h2>
          <div className="space-y-2">
            {(t('signup.step4.steps') || []).map((s, i) => (
              <p key={i} className="text-sm text-gray-500">{s}</p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-brand-500 flex items-center justify-center">
            <span className="text-white font-bold text-xs">P</span>
          </div>
          <span className="font-semibold text-gray-900 text-sm">Paper &amp; Pen ERP</span>
        </Link>
        <LangToggle />
      </div>

      {/* Progress */}
      <div className="bg-white border-b px-4 py-2">
        <div className="max-w-lg mx-auto flex gap-1">
          {Array.from({ length: STEPS }).map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < step ? 'bg-brand-500' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center py-12 px-4">
        <div className="w-full max-w-md">
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('signup.step1.title')}</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('signup.step1.label')}</label>
                <input type="text" value={form.companyName} onChange={(e) => update('companyName', e.target.value)}
                  placeholder={t('signup.step1.placeholder')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
              </div>
              {form.subdomain && (
                <p className="text-xs text-gray-500 mb-6">{t('signup.step1.subdomainLabel')}: <strong>{form.subdomain}.paperandpen.om</strong></p>
              )}
              <button onClick={() => form.companyName && setStep(2)}
                className="w-full py-3 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 disabled:opacity-50"
                disabled={!form.companyName}>
                {t('signup.step1.next')}
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('signup.step2.title')}</h2>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('signup.step2.email')}</label>
                  <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-brand-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('signup.step2.password')}</label>
                  <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-brand-500" />
                  <p className="text-xs text-gray-400 mt-1">{t('signup.step2.passwordHint')}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50">Back</button>
                <button onClick={() => form.email && form.password.length >= 8 && setStep(3)}
                  disabled={!form.email || form.password.length < 8}
                  className="flex-1 py-3 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 disabled:opacity-50">
                  {t('signup.step2.next')}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('signup.step3.title')}</h2>
              <p className="text-xs text-gray-500 mb-6">{t('signup.step3.trialNote')}</p>
              <div className="space-y-3 mb-6">
                {['starter', 'growth', 'business'].map((plan) => (
                  <button key={plan} onClick={() => update('plan', plan)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${form.plan === plan ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-brand-300'}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900 capitalize">{plan}</span>
                      <span className="text-brand-600 font-bold text-sm">
                        {plan === 'starter' ? '12' : plan === 'growth' ? '29' : '55'} OMR/mo
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50">Back</button>
                <button onClick={handleSubmit} className="flex-1 py-3 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600">
                  {t('signup.step3.next')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
