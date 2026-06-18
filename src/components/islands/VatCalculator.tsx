import { useState, useMemo } from 'react';

interface Strings {
  amount: string;
  mode: string;
  addVat: string;
  removeVat: string;
  rate: string;
  net: string;
  vat: string;
  gross: string;
}

const fmt = (n: number) => n.toLocaleString('en-OM', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export default function VatCalculator({ strings }: { strings: Strings }) {
  const [amount, setAmount] = useState(100);
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [ratePct, setRatePct] = useState(5);
  const rate = ratePct / 100;

  const { net, vat, gross } = useMemo(() => {
    const a = amount || 0;
    if (mode === 'add') {
      const v = a * rate;
      return { net: a, vat: v, gross: a + v };
    }
    const n = a / (1 + rate);
    return { net: n, vat: a - n, gross: a };
  }, [amount, mode, rate]);

  return (
    <div className="bg-white rounded-2xl border border-cream-200 shadow-lg p-6 max-w-md mx-auto">
      <label className="block mb-4">
        <span className="lbl">{strings.amount} (OMR)</span>
        <input type="number" min="0" step="0.001" className="fld text-lg font-semibold" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} />
      </label>

      <label className="block mb-4">
        <span className="lbl">{strings.rate} (%)</span>
        <input type="number" min="0" step="0.5" className="fld" value={ratePct} onChange={(e) => setRatePct(parseFloat(e.target.value) || 0)} />
      </label>

      <div className="grid grid-cols-2 gap-2 mb-6">
        <button type="button" onClick={() => setMode('add')} className={`px-4 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all ${mode === 'add' ? 'border-ink-500 bg-ink-500 text-cream-50' : 'border-cream-200 text-ink-400 hover:border-ink-300'}`}>{strings.addVat}</button>
        <button type="button" onClick={() => setMode('remove')} className={`px-4 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all ${mode === 'remove' ? 'border-ink-500 bg-ink-500 text-cream-50' : 'border-cream-200 text-ink-400 hover:border-ink-300'}`}>{strings.removeVat}</button>
      </div>

      <div className="space-y-2.5 text-sm">
        <div className="flex justify-between py-2 border-b border-cream-100"><span className="text-ink-400">{strings.net}</span><span className="font-semibold text-ink-500">{fmt(net)}</span></div>
        <div className="flex justify-between py-2 border-b border-cream-100"><span className="text-ink-400">{strings.vat} ({ratePct}%)</span><span className="font-semibold text-copper-500">{fmt(vat)}</span></div>
        <div className="flex justify-between py-3 bg-cream-50 rounded-lg px-3"><span className="font-semibold text-ink-500">{strings.gross}</span><span className="font-bold text-ink-500 text-base">{fmt(gross)}</span></div>
      </div>
    </div>
  );
}
