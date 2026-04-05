import { useI18n } from '@/i18n/I18nProvider';
const COMPETITORS = ['pp', 'zoho', 'odoo', 'tally', 'sowaan'];
const FEATURE_KEYS = ['arabic', 'gcc_pricing', 'free_trial', 'local_support', 'multi_lang', 'paymob', 'onboarding'];
const MATRIX = {
  pp:     [true, true, true, true, true, true, true],
  zoho:   [false, false, true, false, false, false, false],
  odoo:   [false, false, true, false, false, false, false],
  tally:  [false, true, false, false, false, false, false],
  sowaan: [true, true, false, true, false, false, false],
};
const Check = () => <span className="text-brand-500 font-bold text-lg">✓</span>;
const Cross = () => <span className="text-gray-300 font-bold text-lg">✗</span>;
export default function CompareSection() {
  const { t } = useI18n();
  return (
    <section id="compare" className="py-20 px-4 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">{t('compare.title')}</h2>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-start px-6 py-4 text-gray-500 font-medium w-48">{t('compare.feature')}</th>
                {COMPETITORS.map((c) => (
                  <th key={c} className={`px-4 py-4 text-center font-semibold ${c === 'pp' ? 'text-brand-500 bg-brand-50' : 'text-gray-700'}`}>
                    {t(`compare.${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_KEYS.map((fk, fi) => (
                <tr key={fk} className={fi % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-6 py-3 text-gray-700">{t(`compare.rows.${fk}`)}</td>
                  {COMPETITORS.map((c) => (
                    <td key={c} className={`px-4 py-3 text-center ${c === 'pp' ? 'bg-brand-50' : ''}`}>
                      {MATRIX[c][fi] ? <Check /> : <Cross />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
