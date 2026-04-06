import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';
import {
  checkSubdomainAvailability,
  fetchBillingPlans,
  initiateSignup,
  isTrustedRedirectUrl,
  normalizeSubdomainCandidate,
} from '@/lib/api';
import LangToggle from '@/components/LangToggle';

const STEPS = 3;

const PLAN_FALLBACK = {
  starter:    { id: 'starter',    name: 'Starter',    priceOMR: 25, users: 3,   storage: '5GB' },
  growth:     { id: 'growth',     name: 'Growth',     priceOMR: 49, users: 10,  storage: '20GB' },
  enterprise: { id: 'enterprise', name: 'Enterprise', priceOMR: 99, users: 999, storage: '100GB' },
};

// Map legacy/marketing plan IDs to backend plan IDs
const PLAN_ID_MAP = { free: 'starter' };

function sanitizeInitialSubdomain(value) {
  try {
    return normalizeSubdomainCandidate(value || '');
  } catch {
    return '';
  }
}

function sanitizeSubdomainForForm(value) {
  if (!value) {
    return '';
  }

  return sanitizeInitialSubdomain(value);
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
    language: params.get('lang') || 'en',
    currency: 'OMR',
    plan: PLAN_ID_MAP[params.get('plan')] || params.get('plan') || 'growth',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subdomainStatus, setSubdomainStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
  const [subdomainError, setSubdomainError] = useState('');
  const [plans, setPlans] = useState(PLAN_FALLBACK);

  // Fetch plans from API on mount
  useEffect(() => {
    let cancelled = false;

    async function loadPlans() {
      try {
        const result = await fetchBillingPlans();
        if (cancelled) {
          return;
        }

        const map = {};
        result.forEach((plan) => {
          if (plan && typeof plan === 'object' && typeof plan.id === 'string') {
            map[plan.id] = plan;
          }
        });

        if (Object.keys(map).length > 0) {
          setPlans(map);
        }
      } catch {
        // Keep fallback pricing if the billing API is unavailable.
      }
    }

    loadPlans();

    return () => {
      cancelled = true;
    };
  }, []);

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
      if (field === 'companyName') next.subdomain = sanitizeSubdomainForForm(value);
      if (field === 'subdomain') next.subdomain = sanitizeSubdomainForForm(value);
      return next;
    });
  }

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
        planId: form.plan,
      });

      if (!data?.success) {
        setError(data.message || 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      if (!isTrustedRedirectUrl(data.paymentUrl)) {
        setError('The payment gateway URL was invalid. Please contact support.');
        setLoading(false);
        return;
      }

      try {
        sessionStorage.setItem('pnp_signup_tenant', safeSubdomain);
      } catch {
        console.warn('Unable to store signup tenant in session storage.');
      }

      window.location.href = data.paymentUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please check your connection and try again.');
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
          <span className={step >= 1 ? 'text-brand-600 font-medium' : ''}>Workspace</span>
          <span className={step >= 2 ? 'text-brand-600 font-medium' : ''}>Account</span>
          <span className={step >= 3 ? 'text-brand-600 font-medium' : ''}>Plan &amp; Payment</span>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center py-12 px-4">
        <div className="w-full max-w-md">

          {/* Step 1 — Workspace */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{t('signup.step1.title') || 'Name your workspace'}</h2>
              <p className="text-sm text-gray-500 mb-6">This becomes your unique ERP subdomain.</p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Company name</label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => update('companyName', e.target.value)}
                  placeholder="Al Noor Trading LLC"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              {form.subdomain && (
                <div className="mb-6 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Your workspace URL:</p>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-gray-900">
                      {form.subdomain}.paperandpen.om
                    </span>
                    {subdomainStatus === 'checking' && <span className="text-xs text-gray-400">checking...</span>}
                    {subdomainStatus === 'available' && <span className="text-xs text-green-600 font-medium">✓ Available</span>}
                    {subdomainStatus === 'taken' && <span className="text-xs text-red-500 font-medium">✗ Taken</span>}
                  </div>
                  {subdomainError && <p className="mt-2 text-xs text-red-500">{subdomainError}</p>}
                </div>
              )}
              <button
                onClick={() => form.companyName && form.subdomain && subdomainStatus !== 'taken' && subdomainStatus !== 'checking' && setStep(2)}
                className="w-full py-3 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 disabled:opacity-50 transition-colors"
                disabled={!form.companyName || !form.subdomain || subdomainStatus === 'taken' || subdomainStatus === 'checking'}>
                Continue →
              </button>
            </div>
          )}

          {/* Step 2 — Account */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{t('signup.step2.title') || 'Create your account'}</h2>
              <p className="text-sm text-gray-500 mb-6">You'll use these to log in to your ERP.</p>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="you@company.com"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-brand-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">At least 8 characters</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50">Back</button>
                <button
                  onClick={() => form.email && form.password.length >= 8 && setStep(3)}
                  disabled={!form.email || form.password.length < 8}
                  className="flex-1 py-3 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 disabled:opacity-50">
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Plan & Payment */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Choose your plan</h2>
              <p className="text-sm text-gray-500 mb-6">14-day free trial — card required to activate. Cancel anytime.</p>

              <div className="space-y-3 mb-6">
                {Object.entries(plans).map(([key, plan]) => (
                  <button
                    key={key}
                    onClick={() => update('plan', key)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${form.plan === key ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-brand-300'}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-gray-900">{plan.name}</span>
                        <p className="text-xs text-gray-500 mt-0.5">{plan.users === 999 ? 'Unlimited' : plan.users} users · {plan.storage}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-brand-600 font-bold">{plan.priceOMR} OMR</span>
                        <p className="text-xs text-gray-400">/month</p>
                      </div>
                    </div>
                    {form.plan === key && (
                      <div className="mt-2 pt-2 border-t border-brand-200">
                        <p className="text-xs text-brand-700">
                          ✓ Free for 14 days · then {plan.priceOMR} OMR/month · cancel anytime
                        </p>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Order summary */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Workspace</span>
                  <span className="font-mono text-gray-900">{form.subdomain}.paperandpen.om</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Plan</span>
                  <span className="font-semibold text-gray-900">{plans[form.plan]?.name}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Trial period</span>
                  <span className="text-green-600 font-medium">14 days free</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between text-sm">
                  <span className="text-gray-600">Due today</span>
                  <span className="font-bold text-gray-900">0.000 OMR</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  After trial: {plans[form.plan]?.priceOMR} OMR/month. Card is saved securely via Paymob.
                </p>
              </div>

              {error && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50" disabled={loading}>Back</button>
                <button
                  onClick={handlePayment}
                  disabled={loading}
                  className="flex-1 py-3 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating workspace...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Start Free Trial
                    </>
                  )}
                </button>
              </div>

              <p className="text-center text-xs text-gray-400 mt-4">
                🔒 Card saved securely via Paymob · No charge during trial
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
