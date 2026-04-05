import { useI18n } from '@/i18n/I18nProvider';
const MODULES = [
  { key: 'sales', icon: '📊' },
  { key: 'inventory', icon: '📦' },
  { key: 'hr', icon: '👥' },
  { key: 'accounting', icon: '🧾' },
  { key: 'manufacturing', icon: '⚙️' },
  { key: 'reports', icon: '📈' },
];
export default function ModuleShowcaseSection() {
  const { t } = useI18n();
  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">{t('modules.title')}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {MODULES.map(({ key, icon }) => (
            <div key={key} className="group p-6 rounded-2xl border border-gray-200 hover:border-brand-300 hover:shadow-md transition-all bg-white">
              <div className="text-3xl mb-4">{icon}</div>
              <h3 className="font-semibold text-gray-900 mb-1.5">{t(`modules.${key}.title`)}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{t(`modules.${key}.desc`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
