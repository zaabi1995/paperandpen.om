import { useI18n } from '@/i18n/I18nProvider';
const STATS = [
  { value: '5', label: 'Languages supported' },
  { value: '14', label: 'Days free trial' },
  { value: '< 5min', label: 'Setup time' },
  { value: 'OMR', label: 'Local currency' },
];
export default function TrustSection() {
  const { t } = useI18n();
  return (
    <section className="py-20 px-4 bg-brand-500 text-white">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('trust.title')}</h2>
        <p className="text-brand-100 max-w-2xl mx-auto mb-14 text-lg">{t('trust.sub')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          {STATS.map(({ value, label }) => (
            <div key={label}>
              <div className="text-4xl font-extrabold mb-1">{value}</div>
              <div className="text-brand-100 text-sm">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
