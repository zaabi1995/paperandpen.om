import { useState, useEffect } from 'react';
import {
  checkSubdomainAvailability,
  initiateSignup,
  isTrustedRedirectUrl,
  normalizeSubdomainCandidate,
} from '@/lib/api';
import { useTranslations, type Locale } from '@/i18n';

const MODULES = [
  { key: 'inventory', price: 5 },
  { key: 'hr', price: 8 },
  { key: 'accounting', price: 8 },
  { key: 'manufacturing', price: 10 },
  { key: 'reports', price: 5 },
];

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

  const update = (field: string, value: string) =>
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === 'companyName' || field === 'subdomain') next.subdomain = sanitizeInitial(field === 'companyName' ? value : value);
      return next;
    });
  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const total = MODULES.filter((m) => selected.has(m.key)).reduce((s, m) => s + m.price, 0);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);

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

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Progress */}
      <div className="flex gap-1 mb-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? 'bg-copper-400' : 'bg-cream-200'}`} />
        ))}
      </div>
      <div className="flex justify-between mb-8 text-xs text-ink-300">
        <span className={step >= 1 ? 'text-copper-500 font-medium' : ''}>{t('signup.progress.workspace')}</span>
        <span className={step >= 2 ? 'text-copper-500 font-medium' : ''}>{t('signup.progress.account')}</span>
        <span className={step >= 3 ? 'text-copper-500 font-medium' : ''}>{t('signup.progress.modulesPayment')}</span>
      </div>

      {step === 1 && (
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-500 mb-1">{t('signup.step1.title')}</h1>
          <p className="text-sm text-ink-400 mb-6">{t('signup.step1.subtitle')}</p>
          <label className="lbl">{t('signup.step1.label')}</label>
          <input className="fld mb-4" value={form.companyName} onChange={(e) => update('companyName', e.target.value)} placeholder={t('signup.step1.placeholder')} autoFocus />
          {form.subdomain && (
            <div className="mb-6 px-4 py-3 bg-cream-50 rounded-xl border border-cream-200">
              <p className="text-xs text-ink-300 mb-1">{t('signup.step1.workspaceUrlLabel')}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-semibold text-ink-500" dir="ltr">{form.subdomain}.paperandpen.om</span>
                {subStatus === 'checking' && <span className="text-xs text-ink-300">{t('signup.step1.checking')}</span>}
                {subStatus === 'available' && <span className="text-xs text-emerald-600 font-medium">{t('signup.step1.available')}</span>}
                {subStatus === 'taken' && <span className="text-xs text-red-500 font-medium">{t('signup.step1.taken')}</span>}
              </div>
            </div>
          )}
          <button
            onClick={() => form.companyName && form.subdomain && subStatus !== 'taken' && subStatus !== 'checking' && setStep(2)}
            disabled={!form.companyName || !form.subdomain || subStatus === 'taken' || subStatus === 'checking'}
            className="w-full py-3 bg-ink-500 text-cream-50 font-semibold rounded-xl hover:bg-ink-700 disabled:opacity-50 transition-colors"
          >
            {t('signup.step1.next')} →
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-500 mb-1">{t('signup.step2.title')}</h1>
          <p className="text-sm text-ink-400 mb-6">{t('signup.step2.subtitle')}</p>
          <label className="lbl">{t('signup.step2.emailLabel')}</label>
          <input type="email" className="fld" dir="ltr" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder={t('signup.step2.emailPlaceholder')} autoFocus />
          <p className="text-xs text-ink-300 mt-1 mb-6">{t('signup.step2.emailHint')}</p>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-3 border border-cream-300 text-ink-500 font-semibold rounded-xl hover:bg-cream-50">{t('signup.step2.back')}</button>
            <button onClick={() => emailOk && setStep(3)} disabled={!emailOk} className="flex-1 py-3 bg-ink-500 text-cream-50 font-semibold rounded-xl hover:bg-ink-700 disabled:opacity-50">{t('signup.step2.next')} →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-500 mb-1">{t('signup.step3.title')}</h1>
          <p className="text-sm text-ink-400 mb-4">{t('signup.step3.subtitle')}</p>
          <div className="mb-4 p-4 rounded-xl bg-ink-500 text-cream-50 flex items-center justify-between">
            <div>
              <span className="font-semibold text-sm">{t('signup.step3.baseTitle')}</span>
              <p className="text-xs text-cream-100/60 mt-0.5">{t('signup.step3.baseSub')}</p>
            </div>
            <span className="text-sm font-bold text-emerald-400">{t('signup.step3.baseTag')}</span>
          </div>
          <div className="space-y-2 mb-6">
            {MODULES.map(({ key, price }) => {
              const active = selected.has(key);
              return (
                <button key={key} onClick={() => toggle(key)} className={`w-full text-start p-4 rounded-xl border-2 transition-all flex items-center justify-between ${active ? 'border-copper-400 bg-copper-50' : 'border-cream-200 hover:border-cream-300'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? 'border-copper-400 bg-copper-400' : 'border-cream-300'}`}>
                      {active && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className="font-medium text-sm text-ink-500">{t(`modules.${key}.title`)}</span>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${active ? 'text-copper-600' : 'text-ink-300'}`}>{t('modules.pricePerMonth', { price })}</span>
                </button>
              );
            })}
          </div>
          <div className="bg-cream-50 rounded-xl p-4 mb-4 border border-cream-200 text-sm">
            <div className="flex justify-between mb-2"><span className="text-ink-400">{t('signup.step3.baseRow')}</span><span className="text-emerald-600 font-medium">{t('signup.step3.baseValue')}</span></div>
            {total > 0 && <div className="flex justify-between mb-2"><span className="text-ink-400">{t('signup.step3.addonsLabel')}</span><span className="font-semibold text-ink-500">{total} OMR/mo</span></div>}
            <div className="border-t border-cream-200 pt-2 flex justify-between"><span className="text-ink-400">{t('signup.step3.dueToday')}</span><span className="font-bold text-ink-500">0.000 OMR</span></div>
            <p className="text-xs text-ink-300 mt-2">{total > 0 ? t('signup.step3.paidNote', { total }) : t('signup.step3.freeNote')}</p>
          </div>
          {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} disabled={loading} className="flex-1 py-3 border border-cream-300 text-ink-500 font-semibold rounded-xl hover:bg-cream-50">{t('signup.step3.back')}</button>
            <button onClick={handlePayment} disabled={loading} className="flex-1 py-3 bg-copper-400 text-white font-semibold rounded-xl hover:bg-copper-500 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{t('signup.step3.btnLoading')}</> : total > 0 ? t('signup.step3.btnPaid') : t('signup.step3.btnFree')}
            </button>
          </div>
          <p className="text-center text-xs text-ink-300 mt-4">{total > 0 ? t('signup.step3.footerPaid') : t('signup.step3.footerFree')}</p>
        </div>
      )}
    </div>
  );
}
