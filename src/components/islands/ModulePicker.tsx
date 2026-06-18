import { useState } from 'react';

interface ModuleDef { key: string; price: number | null; included: boolean; icon: string }
interface Strings {
  included: string;
  estimateLabel: string;
  perMonth: string;
  baseLabel: string;
  addonsLabel: string;
  startTrial: string;
  estimateNote: string;
  titles: Record<string, string>;
  descs: Record<string, string>;
}
interface Props { strings: Strings; signupBase: string }

const ICONS: Record<string, string> = {
  sales: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  inventory: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  hr: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  accounting: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  manufacturing: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  reports: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
};

const MODULES: ModuleDef[] = [
  { key: 'sales', price: null, included: true, icon: ICONS.sales },
  { key: 'inventory', price: 5, included: false, icon: ICONS.inventory },
  { key: 'hr', price: 8, included: false, icon: ICONS.hr },
  { key: 'accounting', price: 8, included: false, icon: ICONS.accounting },
  { key: 'manufacturing', price: 10, included: false, icon: ICONS.manufacturing },
  { key: 'reports', price: 5, included: false, icon: ICONS.reports },
];

export default function ModulePicker({ strings, signupBase }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(['sales']));
  const toggle = (key: string) => {
    if (key === 'sales') return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };
  const total = MODULES.filter((m) => selected.has(m.key) && m.price).reduce((s, m) => s + (m.price || 0), 0);
  const modulesParam = [...selected].filter((k) => k !== 'sales').join(',');
  const signupHref = `${signupBase}${modulesParam ? `?modules=${modulesParam}` : ''}`;

  return (
    <div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {MODULES.map((m) => {
          const active = selected.has(m.key);
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => toggle(m.key)}
              className={`group text-start p-6 rounded-2xl border-2 transition-all ${
                m.included
                  ? 'border-ink-500 bg-ink-500 cursor-default'
                  : active
                  ? 'border-copper-400 bg-copper-50'
                  : 'border-cream-200 bg-white hover:border-ink-200 hover:bg-cream-50'
              }`}
            >
              <div className="flex items-start justify-between mb-5">
                <div className={`p-2.5 rounded-xl ${m.included ? 'bg-white/15 text-cream-100' : active ? 'bg-copper-400/15 text-copper-500' : 'bg-cream-100 text-ink-400'}`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={m.icon} /></svg>
                </div>
                {m.included ? (
                  <span className="text-xs font-bold bg-white/20 text-cream-100 px-2.5 py-1 rounded-full tracking-wide">{strings.included}</span>
                ) : (
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${active ? 'border-copper-400 bg-copper-400' : 'border-cream-300 bg-white'}`}>
                    {active && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mb-1.5">
                <h3 className={`font-semibold text-base ${m.included ? 'text-cream-50' : 'text-ink-500'}`}>{strings.titles[m.key]}</h3>
                {m.price && <span className={`text-xs font-bold ${active ? 'text-copper-500' : 'text-ink-300'}`}>+{m.price} {strings.perMonth}</span>}
              </div>
              <p className={`text-sm leading-relaxed ${m.included ? 'text-cream-100/80' : 'text-ink-400'}`}>{strings.descs[m.key]}</p>
            </button>
          );
        })}
      </div>

      <div className="bg-cream-50 border border-cream-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <p className="text-xs font-semibold text-ink-300 tracking-widest uppercase mb-1">{strings.estimateLabel}</p>
          <p className="font-display text-3xl font-bold text-ink-500">
            {total === 0 ? strings.baseLabel : `${total} OMR`}
            {total > 0 && <span className="text-base text-ink-300 font-normal"> {strings.perMonth}</span>}
          </p>
          <p className="text-xs text-ink-400 mt-1">{strings.estimateNote}</p>
        </div>
        <a href={signupHref} className="inline-flex items-center gap-2 px-7 py-3.5 bg-ink-500 text-cream-50 font-semibold rounded-xl hover:bg-ink-700 transition-all shadow-md whitespace-nowrap">
          {strings.startTrial}
        </a>
      </div>
    </div>
  );
}
