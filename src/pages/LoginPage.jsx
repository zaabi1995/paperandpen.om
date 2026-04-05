import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';
import LangToggle from '@/components/LangToggle';
export default function LoginPage() {
  const { t } = useI18n();
  const [form, setForm] = useState({ email: '', password: '' });
  function handleSubmit(e) {
    e.preventDefault();
    // Real login redirects to tenant subdomain — API not yet deployed
    alert('Login integration coming soon. The ERP backend is being deployed.');
  }
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-brand-500 flex items-center justify-center">
            <span className="text-white font-bold text-xs">P</span>
          </div>
          <span className="font-semibold text-gray-900 text-sm">Paper &amp; Pen ERP</span>
        </Link>
        <LangToggle />
      </div>
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">{t('login.title')}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('login.email')}</label>
              <input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-brand-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('login.password')}</label>
              <input type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-brand-500" required />
            </div>
            <button type="submit" className="w-full py-3 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600">
              {t('login.submit')}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            {t('login.noAccount')}{' '}
            <Link to="/signup" className="text-brand-500 font-medium hover:underline">{t('login.signUp')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
