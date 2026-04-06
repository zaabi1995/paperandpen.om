import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';

const STATS = [
  { valueKey: 'trust.stat1_value', labelKey: 'trust.stat1_label' },
  { valueKey: 'trust.stat2_value', labelKey: 'trust.stat2_label' },
  { valueKey: 'trust.stat3_value', labelKey: 'trust.stat3_label' },
  { valueKey: 'trust.stat4_value', labelKey: 'trust.stat4_label' },
];

export default function TrustSection() {
  const { t } = useI18n();

  return (
    <section className="py-24 px-6 lg:px-10 bg-ink-500 relative overflow-hidden">
      {/* Decorative paper texture on dark */}
      <div className="absolute inset-0 bg-paper-texture opacity-30 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-copper-400/10 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-ink-700/50 blur-3xl rounded-full pointer-events-none" />

      <div className="relative max-w-5xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: copy */}
          <div>
            <p className="text-xs font-semibold text-copper-300 tracking-widest uppercase mb-4">{t('trust.eyebrow')}</p>
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-cream-50 leading-tight mb-6">
              {t('trust.title')}
            </h2>
            <p className="text-cream-100/60 text-lg leading-relaxed mb-10">
              {t('trust.sub')}
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-copper-400 text-white font-semibold rounded-xl hover:bg-copper-500 transition-all shadow-lg"
            >
              {t('trust.cta')}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Right: stats grid */}
          <div className="grid grid-cols-2 gap-5">
            {STATS.map(({ valueKey, labelKey }) => (
              <div key={valueKey} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                <p className="font-display text-4xl font-bold text-copper-300 mb-2">{t(valueKey)}</p>
                <p className="text-cream-100/60 text-sm leading-snug">{t(labelKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
