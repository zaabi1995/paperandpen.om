import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';

export default function Footer() {
  const { t } = useI18n();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ink-900 text-cream-100/50 relative overflow-hidden">
      <div className="absolute inset-0 bg-paper-texture opacity-20 pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-16 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-14">
          {/* Brand */}
          <div className="lg:col-span-2">
            <img src="/logo-white.svg" alt="Paper & Pen ERP" className="h-9 w-auto mb-5 opacity-90" />
            <p className="text-sm leading-relaxed max-w-xs mb-6">{t('footer.tagline')}</p>
            <a
              href={`mailto:${t('footer.email')}`}
              className="inline-flex items-center gap-2 text-sm text-copper-300 hover:text-copper-200 font-medium transition-colors mb-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {t('footer.email')}
            </a>
            <a
              href="https://wa.me/96898899100"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-copper-300 hover:text-copper-200 font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.693.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              +968 9889 9100
            </a>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-cream-100 text-sm font-semibold mb-4 tracking-wide">{t('footer.product')}</h3>
            <ul className="space-y-2.5">
              <li><a href="/#modules" className="text-sm hover:text-cream-100 transition-colors">{t('nav.features')}</a></li>
              <li><a href="/#pricing" className="text-sm hover:text-cream-100 transition-colors">{t('nav.pricing')}</a></li>
              <li><a href="/#compare" className="text-sm hover:text-cream-100 transition-colors">{t('nav.compare')}</a></li>
              <li><Link to="/signup" className="text-sm hover:text-cream-100 transition-colors">{t('nav.startFree')}</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-cream-100 text-sm font-semibold mb-4 tracking-wide">{t('footer.support') || 'Support'}</h3>
            <ul className="space-y-2.5">
              <li><a href="mailto:support@paperandpen.om" className="text-sm hover:text-cream-100 transition-colors">{t('footer.contactSupport') || 'Contact Support'}</a></li>
              <li><a href="https://wa.me/96898899100" target="_blank" rel="noopener noreferrer" className="text-sm hover:text-cream-100 transition-colors">WhatsApp</a></li>
              <li><Link to="/login" className="text-sm hover:text-cream-100 transition-colors">{t('nav.login')}</Link></li>
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
