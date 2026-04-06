import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';
import LangToggle from '@/components/LangToggle';

export default function Navbar() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-cream-50/95 backdrop-blur-md shadow-sm border-b border-cream-200' : 'bg-transparent'}`}>
      <nav className="max-w-7xl mx-auto px-6 lg:px-10 h-18 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img src="/logo.svg" alt="Paper & Pen ERP" className="h-9 w-auto" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#modules" className="text-sm font-medium text-ink-500/70 hover:text-ink-500 transition-colors tracking-wide">{t('nav.features')}</a>
          <a href="#pricing" className="text-sm font-medium text-ink-500/70 hover:text-ink-500 transition-colors tracking-wide">{t('nav.pricing')}</a>
          <a href="#compare" className="text-sm font-medium text-ink-500/70 hover:text-ink-500 transition-colors tracking-wide">{t('nav.compare')}</a>
          <LangToggle />
          <div className="w-px h-4 bg-ink-200" />
          <Link to="/login" className="text-sm font-medium text-ink-500/70 hover:text-ink-500 transition-colors">{t('nav.login')}</Link>
          <Link to="/signup" className="px-5 py-2.5 bg-ink-500 text-cream-50 text-sm font-semibold rounded-lg hover:bg-ink-700 transition-all shadow-sm hover:shadow-md">
            {t('nav.startFree')}
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-lg text-ink-500 hover:bg-ink-100/50 transition-colors"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-cream-200 bg-cream-50 px-6 py-5 flex flex-col gap-4 shadow-lg">
          <a href="#modules" className="text-sm font-medium text-ink-500/70" onClick={() => setOpen(false)}>{t('nav.features')}</a>
          <a href="#pricing" className="text-sm font-medium text-ink-500/70" onClick={() => setOpen(false)}>{t('nav.pricing')}</a>
          <a href="#compare" className="text-sm font-medium text-ink-500/70" onClick={() => setOpen(false)}>{t('nav.compare')}</a>
          <div className="flex items-center gap-3">
            <LangToggle />
          </div>
          <div className="h-px bg-cream-200" />
          <Link to="/login" className="text-sm font-medium text-ink-500/70" onClick={() => setOpen(false)}>{t('nav.login')}</Link>
          <Link to="/signup" className="block text-center px-4 py-2.5 bg-ink-500 text-cream-50 text-sm font-semibold rounded-lg" onClick={() => setOpen(false)}>
            {t('nav.startFree')}
          </Link>
        </div>
      )}
    </header>
  );
}
