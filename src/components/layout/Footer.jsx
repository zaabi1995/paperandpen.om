import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';

export default function Footer() {
  const { t } = useI18n();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ink-900 text-cream-100/50 relative overflow-hidden">
      <div className="absolute inset-0 bg-paper-texture opacity-20 pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-16 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-14">
          {/* Brand */}
          <div className="lg:col-span-2">
            <img src="/logo-white.svg" alt="Paper & Pen ERP" className="h-9 w-auto mb-5 opacity-90" />
            <p className="text-sm leading-relaxed max-w-xs mb-6">{t('footer.tagline')}</p>
            <a
              href={`mailto:${t('footer.email')}`}
              className="inline-flex items-center gap-2 text-sm text-copper-300 hover:text-copper-200 font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {t('footer.email')}
            </a>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-cream-100 text-sm font-semibold mb-4 tracking-wide">{t('footer.product')}</h3>
            <ul className="space-y-2.5">
              <li><a href="#modules" className="text-sm hover:text-cream-100 transition-colors">{t('nav.features')}</a></li>
              <li><a href="#pricing" className="text-sm hover:text-cream-100 transition-colors">{t('nav.pricing')}</a></li>
              <li><a href="#compare" className="text-sm hover:text-cream-100 transition-colors">{t('nav.compare')}</a></li>
              <li><Link to="/signup" className="text-sm hover:text-cream-100 transition-colors">{t('nav.startFree')}</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-cream-100 text-sm font-semibold mb-4 tracking-wide">{t('footer.legal')}</h3>
            <ul className="space-y-2.5">
              <li><Link to="/terms" className="text-sm hover:text-cream-100 transition-colors">{t('footer.terms')}</Link></li>
              <li><Link to="/privacy" className="text-sm hover:text-cream-100 transition-colors">{t('footer.privacy')}</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-center sm:text-start">{t('footer.rights', { year })}</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs">{t('footer.status')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
