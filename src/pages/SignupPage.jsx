import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';
import {
  checkSubdomainAvailability,
  initiateSignup,
  isTrustedRedirectUrl,
  normalizeSubdomainCandidate,
} from '@/lib/api';
import LangToggle from '@/components/LangToggle';

const STEPS = 3;

const MODULES = [
  { key: 'inventory',     price: 5 },
  { key: 'hr',            price: 8 },
  { key: 'accounting',    price: 8 },
  { key: 'manufacturing', price: 10 },
  { key: 'reports',       price: 5 },
];

function sanitizeInitialSubdomain(value) {
  try {
    return normalizeSubdomainCandidate(value || '');
  } catch {
    return '';
  }
}

function parseModulesParam(value) {
  if (!value) return new Set();
  const valid = new Set(MODULES.map(m => m.key));
  return new Set(value.split(',').filter(k => valid.has(k)));
}

export default function SignupPage() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    companyName: '',
    subdomain: sanitizeInitialSubdomain(params.get('subdomain')),
    email: '',
    password: '',
  });
  const [selectedModules, setSelectedModules] = useState(parseModulesParam(params.get('modules')));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subdomainStatus, setSubdomainStatus] = useState(null);
  const [subdomainError, setSubdomainError] = useState('');

  // Check subdomain availability debounced
  useEffect(() => {
    if (!form.subdomain || form.subdomain.length < 3) {
      setSubdomainStatus(null);
      setSubdomainError('');
      return;
    }

    setSubdomainStatus('checking');
    setSubdomainError('');
    const timer = setTimeout(async () => {
      try {
        const { available } = await checkSubdomainAvailability(form.subdomain);
        setSubdomainStatus(available ? 'available' : 'taken');
      } catch {
        // Network/CORS error — don't block the user, let backend validate
        setSubdomainStatus('unknown');
        setSubdomainError('Unable to verify availability right now. You can continue anyway.');
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [form.subdomain]);

  function update(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === 'companyName') next.subdomain = sanitizeInitialSubdomain(value);
      if (field === 'subdomain') next.subdomain = sanitizeInitialSubdomain(value);
      return next;
    });
  }

  function toggleModule(key) {
    setSelectedModules(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const moduleTotal = MODULES.filter(m => selectedModules.has(m.key)).reduce((s, m) => s + m.price, 0);

  async function handlePayment() {
    setLoading(true);
    setError('');
    try {
      const safeSubdomain = normalizeSubdomainCandidate(form.subdomain);
      const data = await initiateSignup({
        tenantId: safeSubdomain,
        companyName: form.companyName.trim(),
        email: form.email.trim(),
        ownerName: form.companyName.trim(),
        password: form.password,
        planId: 'starter',
        modules: [...selectedModules],
      });

      if (!data?.success) {
        setError(data.message || t('signup.errors.generic') || 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      try {
        sessionStorage.setItem('pnp_signup_tenant', safeSubdomain);
      } catch {
        console.warn('Unable to store signup tenant in session storage.');
      }

      // FREE path — no Paymob, tenant is already provisioned. Send user to their workspace.
      if (data.free && data.workspaceUrl) {
        if (!isTrustedRedirectUrl(data.workspaceUrl)) {
          // Fallback: build URL from tenantId if returned URL isn't trusted
          window.location.href = `https://${safeSubdomain}.paperandpen.om/login?email=${encodeURIComponent(form.email.trim())}`;
          return;
        }
        window.location.href = data.workspaceUrl + `?email=${encodeURIComponent(form.email.trim())}`;
        return;
      }

      // PAID path — Paymob card capture required.
      if (!isTrustedRedirectUrl(data.paymentUrl)) {
        setError(t('signup.errors.gateway') || 'The payment gateway URL was invalid. Please contact support.');
        setLoading(false);
        return;
      }

      window.location.href = data.paymentUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : (t('signup.errors.network') || 'Network error. Please check your connection and try again.'));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="Paper & Pen ERP" className="h-7 w-auto" />
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 hidden sm:inline">Secured by Paymob</span>
          <LangToggle />
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white border-b px-4 py-2">
        <div className="max-w-lg mx-auto flex gap-1">
          {Array.from({ length: STEPS }).map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < step ? 'bg-brand-500' : 'bg-gray-200'}`} />
          ))}
        </div>
        <div className="max-w-lg mx-auto flex justify-between mt-1 text-xs text-gray-400">
          <span className={step >= 1 ? 'text-brand-600 font-medium' : ''}>{t('signup.progress.workspace') || 'Workspace'}</span>
          <span className={step >= 2 ? 'text-brand-600 font-medium' : ''}>{t('signup.progress.account') || 'Account'}</span>
          <span className={step >= 3 ? 'text-brand-600 font-medium' : ''}>{t('signup.progress.modulesPayment') || 'Modules & Payment'}</span>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center py-12 px-4">
        <div className="w-full max-w-md">

          {/* Step 1 — Workspace */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{t('signup.step1.title') || "What's your company name?"}</h2>
              <p className="text-sm text-gray-500 mb-6">{t('signup.step1.subtitle') || 'This becomes your unique ERP subdomain.'}</p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('signup.step1.label') || 'Company name'}</label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => update('companyName', e.target.value)}
                  placeholder={t('signup.step1.placeholder') || 'Al Noor Trading LLC'}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              {form.subdomain && (
                <div className="mb-6 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">{t('signup.step1.workspaceUrlLabel') || 'Your workspace URL:'}</p>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-gray-900" dir="ltr">
                      {form.subdomain}.paperandpen.om
                    </span>
                    {subdomainStatus === 'checking' && <span className="text-xs text-gray-400">{t('signup.step1.checking') || 'checking...'}</span>}
                    {subdomainStatus === 'available' && <span className="text-xs text-green-600 font-medium">{t('signup.step1.available') || '✓ Available'}</span>}
                    {subdomainStatus === 'taken' && <span className="text-xs text-red-500 font-medium">{t('signup.step1.taken') || '✗ Taken'}</span>}
                  </div>
                  {subdomainError && <p className="mt-2 text-xs text-red-500">{subdomainError}</p>}
                </div>
              )}
              <button
                onClick={() => form.companyName && form.subdomain && subdomainStatus !== 'taken' && subdomainStatus !== 'checking' && setStep(2)}
                className="w-full py-3 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 disabled:opacity-50 transition-colors"
                disabled={!form.companyName || !form.subdomain || subdomainStatus === 'taken' || subdomainStatus === 'checking'}>
                {t('signup.step1.next') || 'Continue'} →
              </button>
            </div>
          )}

          {/* Step 2 — Account */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{t('signup.step2.title') || 'Your account details'}</h2>
              <p className="text-sm text-gray-500 mb-6">{t('signup.step2.subtitle') || "You'll use these to log in to your ERP."}</p>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('signup.step2.emailLabel') || 'Email address'}</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder={t('signup.step2.emailPlaceholder') || 'you@company.com'}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-brand-500"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('signup.step2.passwordLabel') || 'Password'}</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                    placeholder={t('signup.step2.passwordPlaceholder') || 'Min. 8 characters'}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-brand-500"
                    dir="ltr"
                  />
                  <p className="text-xs text-gray-400 mt-1">{t('signup.step2.passwordHint') || 'At least 8 characters'}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50">{t('signup.step2.back') || 'Back'}</button>
                <button
                  onClick={() => form.email && form.password.length >= 8 && setStep(3)}
                  disabled={!form.email || form.password.length < 8}
                  className="flex-1 py-3 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 disabled:opacity-50">
                  {t('signup.step2.next') || 'Continue'} →
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Modules & Payment */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{t('signup.step3.title') || 'Pick your modules'}</h2>
              <p className="text-sm text-gray-500 mb-4">{t('signup.step3.subtitle') || 'Sales & Invoicing is always free. Add what you need.'}</p>

              {/* Base (always included) */}
              <div className="mb-4 p-4 rounded-xl bg-gray-900 text-white flex items-center justify-between">
                <div>
                  <span className="font-semibold text-sm">{t('signup.step3.baseTitle') || 'Sales & Invoicing'}</span>
                  <p className="text-xs text-gray-400 mt-0.5">{t('signup.step3.baseSub') || 'Quotes, invoices, payments · 3 users'}</p>
                </div>
                <span className="text-sm font-bold text-green-400">{t('signup.step3.baseTag') || 'Free'}</span>
              </div>

              {/* Module toggles */}
              <div className="space-y-2 mb-6">
                {MODULES.map(({ key, price }) => {
                  const active = selectedModules.has(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleModule(key)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ${active ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${active ? 'border-brand-500 bg-brand-500' : 'border-gray-300'}`}>
                          {active && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <span className="font-medium text-sm text-gray-900">{t(`modules.${key}.title`)}</span>
                      </div>
                      <span className={`text-sm font-bold shrink-0 ${active ? 'text-brand-600' : 'text-gray-400'}`}>+{price} OMR/mo</span>
                    </button>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">{t('signup.step3.workspaceLabel') || 'Workspace'}</span>
                  <span className="font-mono text-gray-900 text-xs" dir="ltr">{form.subdomain}.paperandpen.om</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">{t('signup.step3.baseRow') || 'Base (Sales)'}</span>
                  <span className="text-green-600 font-medium">{t('signup.step3.baseValue') || 'Free forever'}</span>
                </div>
                {moduleTotal > 0 && (
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">{t('signup.step3.addonsLabel') || 'Add-on modules'}</span>
                    <span className="font-semibold text-gray-900">{moduleTotal} OMR/mo</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2 flex justify-between text-sm">
                  <span className="text-gray-600">{t('signup.step3.dueToday') || 'Due today'}</span>
                  <span className="font-bold text-gray-900">0.000 OMR</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {moduleTotal > 0
                    ? (t('signup.step3.paidNote') || `After 14-day trial: {{total}} OMR/month. Card saved securely via Paymob (0.100 OMR verification, refunded immediately).`).replace('{{total}}', moduleTotal)
                    : (t('signup.step3.freeNote') || 'Free forever. No credit card required. Add modules anytime.')}
                </p>
              </div>

              {error && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50" disabled={loading}>{t('signup.step3.back') || 'Back'}</button>
                <button
                  onClick={handlePayment}
                  disabled={loading}
                  className="flex-1 py-3 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t('signup.step3.btnLoading') || 'Creating workspace...'}
                    </>
                  ) : moduleTotal > 0 ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      {t('signup.step3.btnPaid') || 'Start 14-day Trial'}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t('signup.step3.btnFree') || 'Create my workspace'}
                    </>
                  )}
                </button>
              </div>

              <p className="text-center text-xs text-gray-400 mt-4">
                {moduleTotal > 0
                  ? (t('signup.step3.footerPaid') || 'Card secured via Paymob · 0.100 OMR auth refunded immediately')
                  : (t('signup.step3.footerFree') || 'No credit card required · Sales & Invoicing free forever')}
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
