import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';
import LangToggle from '@/components/LangToggle';
import { normalizeSubdomainCandidate } from '@/lib/api';

export default function LoginPage() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    workspace: '',
    email: params.get('email') || '',
  });
  const [error, setError] = useState('');

  // Restore last-used workspace from sessionStorage
  useEffect(() => {
    try {
      const last = sessionStorage.getItem('pnp_signup_tenant') || sessionStorage.getItem('pnp_last_workspace');
      if (last && !form.workspace) {
        setForm((f) => ({ ...f, workspace: last }));
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    let workspace;
    try {
      workspace = normalizeSubdomainCandidate(form.workspace);
    } catch {
      workspace = '';
    }
    if (!workspace || workspace.length < 3) {
      setError('Please enter your workspace name (e.g. "yourcompany").');
      return;
    }
    try {
      sessionStorage.setItem('pnp_last_workspace', workspace);
    } catch {}
    // Send user straight to the OTP sign-in page on their workspace, passwordless by default.
    const target = `https://${workspace}.paperandpen.om/login/code?email=${encodeURIComponent(form.email.trim())}`;
    window.location.href = target;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="Paper & Pen ERP" className="h-7 w-auto" />
          <span className="font-semibold text-gray-900 text-sm hidden sm:inline">Paper &amp; Pen ERP</span>
        </Link>
        <LangToggle />
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('login.title') || 'Welcome back'}</h2>
          <p className="text-sm text-gray-500 mb-8">Sign in to your workspace.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Workspace</label>
              <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden focus-within:border-brand-500">
                <input
                  type="text"
                  value={form.workspace}
                  onChange={(e) => setForm((f) => ({ ...f, workspace: e.target.value }))}
                  placeholder="yourcompany"
                  className="flex-1 px-4 py-2.5 text-sm focus:outline-none"
                  required
                  autoFocus
                />
                <span className="px-3 text-xs text-gray-500 bg-gray-50 border-l border-gray-200 py-2.5">.paperandpen.om</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">The subdomain you chose at signup.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('login.email') || 'Email'}</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="you@company.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-brand-500"
                required
              />
            </div>
            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
            )}
            <button type="submit" className="w-full py-3 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600">
              Continue to workspace →
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-4 text-center">
            We'll send a one-time code to your email. No password required.
          </p>
          <p className="text-center text-sm text-gray-500 mt-6">
            {t('login.noAccount') || "Don't have an account?"}{' '}
            <Link to="/signup" className="text-brand-500 font-medium hover:underline">{t('login.signUp') || 'Sign up'}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
