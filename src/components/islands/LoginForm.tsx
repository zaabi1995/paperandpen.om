import { useState, useEffect } from 'react';
import { normalizeSubdomainCandidate } from '@/lib/api';
import { useTranslations, type Locale } from '@/i18n';

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
    <div className="w-full max-w-sm mx-auto">
      <h1 className="font-display text-2xl font-bold text-ink-500 mb-2">{t('login.title')}</h1>
      <p className="text-sm text-ink-400 mb-8">{t('login.subtitle')}</p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="lbl">{t('login.workspace')}</label>
          <div className="flex items-stretch rounded-xl border border-cream-300 overflow-hidden focus-within:border-ink-500">
            <input value={workspace} onChange={(e) => setWorkspace(e.target.value)} placeholder="yourcompany" className="flex-1 px-4 py-2.5 text-sm outline-none bg-transparent" dir="ltr" required autoFocus />
            <span className="px-3 flex items-center text-xs text-ink-400 bg-cream-100 border-s border-cream-200">.paperandpen.om</span>
          </div>
        </div>
        <div>
          <label className="lbl">{t('login.email')}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="fld" dir="ltr" required />
        </div>
        {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
        <button type="submit" className="w-full py-3 bg-ink-500 text-cream-50 font-semibold rounded-xl hover:bg-ink-700 transition-colors">{t('login.submit')} →</button>
      </form>
      <p className="text-xs text-ink-400 mt-4 text-center">{t('login.otpNote')}</p>
    </div>
  );
}
