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

export default function CompareSection() {
  const { t } = useI18n();

  return (
    <section id="compare" className="py-24 px-6 lg:px-10 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="max-w-2xl mb-14">
          <p className="text-xs font-semibold text-copper-400 tracking-widest uppercase mb-3">{t('compare.eyebrow')}</p>
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-ink-500 leading-tight">
            {t('compare.title')}
          </h2>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-cream-200 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-cream-100">
                <th className="text-start px-6 py-5 text-ink-300 font-medium w-48 bg-cream-50">{t('compare.feature')}</th>
                {COMPETITORS.map((c) => (
                  <th
                    key={c}
                    className={`px-4 py-5 text-center font-semibold ${
                      c === 'pp'
                        ? 'bg-ink-500 text-cream-50'
                        : 'bg-cream-50 text-ink-400'
                    }`}
                  >
                    {c === 'pp' ? (
                      <span className="font-display font-bold">{t(`compare.${c}`)}</span>
                    ) : (
                      t(`compare.${c}`)
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_KEYS.map((fk, fi) => (
                <tr key={fk} className="border-b border-cream-50 last:border-0 hover:bg-cream-50/50 transition-colors">
                  <td className="px-6 py-4 text-ink-500 font-medium bg-cream-50/30">{t(`compare.rows.${fk}`)}</td>
                  {COMPETITORS.map((c) => (
                    <td key={c} className={`px-4 py-4 text-center ${c === 'pp' ? 'bg-ink-500/5' : ''}`}>
                      {MATRIX[c][fi] ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-cream-100 text-ink-200">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </span>
                      )}
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
