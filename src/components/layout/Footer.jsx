import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';
export default function Footer() {
  const { t } = useI18n();
  const year = new Date().getFullYear();
  return (
    <footer className="bg-gray-900 text-gray-400 py-12 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-md bg-brand-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">P</span>
            </div>
            <span className="text-white font-semibold">Paper &amp; Pen ERP</span>
          </div>
          <p className="text-sm">{t('footer.tagline')}</p>
        </div>
        <div>
          <h3 className="text-white text-sm font-medium mb-3">{t('footer.contact')}</h3>
          <a href={`mailto:${t('footer.email')}`} className="text-sm hover:text-white">{t('footer.email')}</a>
        </div>
        <div>
          <h3 className="text-white text-sm font-medium mb-3">Legal</h3>
          <div className="flex flex-col gap-2">
            <Link to="/terms" className="text-sm hover:text-white">{t('footer.terms')}</Link>
            <Link to="/privacy" className="text-sm hover:text-white">{t('footer.privacy')}</Link>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-gray-800 text-center text-xs">
        {t('footer.rights', { year })}
      </div>
    </footer>
  );
}
