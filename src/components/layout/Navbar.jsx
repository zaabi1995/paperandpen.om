import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';
import LangToggle from '@/components/LangToggle';

export default function Navbar() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <span className="font-semibold text-gray-900">Paper &amp; Pen ERP</span>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900">{t('nav.pricing')}</a>
          <a href="#compare" className="text-sm text-gray-600 hover:text-gray-900">{t('nav.compare')}</a>
          <LangToggle />
          <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900">{t('nav.login')}</Link>
          <Link to="/signup" className="px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors">
            {t('nav.startFree')}
          </Link>
        </div>
        <button className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100" onClick={() => setOpen(!open)}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </nav>
      {open && (
        <div className="md:hidden border-t bg-white px-4 py-4 flex flex-col gap-4">
          <a href="#pricing" className="text-sm text-gray-700" onClick={() => setOpen(false)}>{t('nav.pricing')}</a>
          <a href="#compare" className="text-sm text-gray-700" onClick={() => setOpen(false)}>{t('nav.compare')}</a>
          <LangToggle />
          <Link to="/login" className="text-sm text-gray-700" onClick={() => setOpen(false)}>{t('nav.login')}</Link>
          <Link to="/signup" className="block text-center px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg" onClick={() => setOpen(false)}>
            {t('nav.startFree')}
          </Link>
        </div>
      )}
    </header>
  );
}
