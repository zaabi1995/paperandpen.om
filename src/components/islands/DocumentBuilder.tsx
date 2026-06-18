import { useState, useMemo } from 'react';

type DocType = 'invoice' | 'quotation' | 'proforma' | 'receipt' | 'purchase-order' | 'delivery-note';

interface Strings {
  docLabel: string; // "INVOICE", "QUOTATION"...
  from: string;
  billTo: string;
  docNo: string;
  date: string;
  item: string;
  qty: string;
  rate: string;
  amount: string;
  addLine: string;
  subtotal: string;
  vat: string;
  total: string;
  notes: string;
  currency: string;
  applyVat: string;
  print: string;
  yourCompany: string;
  clientName: string;
  signupCta: string;
  signupHref: string;
  showVat: boolean;
}

interface Line { desc: string; qty: number; rate: number }

// Common currencies for international use. decimals: OMR/BHD/KWD = 3, most = 2.
const CURRENCIES: { code: string; decimals: number }[] = [
  { code: 'OMR', decimals: 3 },
  { code: 'AED', decimals: 2 },
  { code: 'SAR', decimals: 2 },
  { code: 'QAR', decimals: 2 },
  { code: 'BHD', decimals: 3 },
  { code: 'KWD', decimals: 3 },
  { code: 'USD', decimals: 2 },
  { code: 'EUR', decimals: 2 },
  { code: 'GBP', decimals: 2 },
  { code: 'INR', decimals: 2 },
];

export default function DocumentBuilder({ strings, docType }: { strings: Strings; docType: DocType }) {
  const [company, setCompany] = useState('');
  const [client, setClient] = useState('');
  const [docNo, setDocNo] = useState('001');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [currency, setCurrency] = useState('OMR');
  const [vatEnabled, setVatEnabled] = useState(strings.showVat);
  const [vatRate, setVatRate] = useState(5);
  const [lines, setLines] = useState<Line[]>([{ desc: '', qty: 1, rate: 0 }]);

  const decimals = CURRENCIES.find((c) => c.code === currency)?.decimals ?? 2;
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  const subtotal = useMemo(() => lines.reduce((s, l) => s + (l.qty || 0) * (l.rate || 0), 0), [lines]);
  const vat = vatEnabled ? subtotal * (vatRate / 100) : 0;
  const total = subtotal + vat;

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((p) => [...p, { desc: '', qty: 1, rate: 0 }]);
  const delLine = (i: number) => setLines((p) => (p.length > 1 ? p.filter((_, idx) => idx !== i) : p));

  const doPrint = () => {
    document.body.classList.add('printing-doc');
    window.print();
    setTimeout(() => document.body.classList.remove('printing-doc'), 500);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8 items-start">
      {/* Editor */}
      <div className="no-print space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="lbl">{strings.from}</span>
            <input className="fld" value={company} onChange={(e) => setCompany(e.target.value)} placeholder={strings.yourCompany} />
          </label>
          <label className="block">
            <span className="lbl">{strings.billTo}</span>
            <input className="fld" value={client} onChange={(e) => setClient(e.target.value)} placeholder={strings.clientName} />
          </label>
          <label className="block">
            <span className="lbl">{strings.docNo}</span>
            <input className="fld" value={docNo} onChange={(e) => setDocNo(e.target.value)} />
          </label>
          <label className="block">
            <span className="lbl">{strings.date}</span>
            <input type="date" className="fld" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>

        <div className="rounded-xl border border-cream-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 bg-cream-50 px-3 py-2 text-xs font-semibold text-ink-400">
            <span className="col-span-6">{strings.item}</span>
            <span className="col-span-2 text-center">{strings.qty}</span>
            <span className="col-span-3 text-end">{strings.rate}</span>
            <span className="col-span-1"></span>
          </div>
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-cream-100 items-center">
              <input className="col-span-6 fld-sm" value={l.desc} onChange={(e) => setLine(i, { desc: e.target.value })} placeholder={strings.item} />
              <input type="number" min="0" className="col-span-2 fld-sm text-center" value={l.qty} onChange={(e) => setLine(i, { qty: parseFloat(e.target.value) || 0 })} />
              <input type="number" min="0" step="0.001" className="col-span-3 fld-sm text-end" value={l.rate} onChange={(e) => setLine(i, { rate: parseFloat(e.target.value) || 0 })} />
              <button type="button" onClick={() => delLine(i)} className="col-span-1 text-ink-300 hover:text-red-500" aria-label="Remove line">×</button>
            </div>
          ))}
          <button type="button" onClick={addLine} className="w-full px-3 py-2.5 text-sm font-medium text-copper-500 hover:bg-copper-50 border-t border-cream-100">+ {strings.addLine}</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="lbl">{strings.currency}</span>
            <select className="fld" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="lbl">{strings.vat} %</span>
            <input type="number" min="0" step="0.5" className="fld" value={vatRate} onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)} disabled={!vatEnabled} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-500">
          <input type="checkbox" checked={vatEnabled} onChange={(e) => setVatEnabled(e.target.checked)} className="accent-copper-400" />
          {strings.applyVat}
        </label>

        <label className="block">
          <span className="lbl">{strings.notes}</span>
          <textarea className="fld" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        <button type="button" onClick={doPrint} className="w-full px-5 py-3 bg-ink-500 text-cream-50 font-semibold rounded-xl hover:bg-ink-700 transition-all">
          {strings.print}
        </button>
        <a href={strings.signupHref} className="block text-center text-sm text-copper-500 font-medium hover:text-copper-600">{strings.signupCta} →</a>
      </div>

      {/* Live preview / printable document */}
      <div className="print-area bg-white rounded-2xl border border-cream-200 shadow-lg p-8 text-ink-700">
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="font-display text-2xl font-bold text-ink-500">{company || strings.yourCompany}</div>
          </div>
          <div className="text-end">
            <div className="font-display text-3xl font-bold text-copper-500 tracking-tight">{strings.docLabel}</div>
            <div className="text-sm text-ink-400 mt-1">#{docNo}</div>
            {date && <div className="text-sm text-ink-400">{date}</div>}
          </div>
        </div>

        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-300 mb-1">{strings.billTo}</div>
          <div className="font-medium text-ink-500">{client || strings.clientName}</div>
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b-2 border-ink-100 text-ink-400 text-xs uppercase tracking-wide">
              <th className="text-start py-2">{strings.item}</th>
              <th className="text-center py-2 w-16">{strings.qty}</th>
              <th className="text-end py-2 w-28">{strings.rate}</th>
              <th className="text-end py-2 w-28">{strings.amount}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-cream-100">
                <td className="py-2.5 text-ink-600">{l.desc || '—'}</td>
                <td className="py-2.5 text-center text-ink-500">{l.qty}</td>
                <td className="py-2.5 text-end text-ink-500">{fmt(l.rate)}</td>
                <td className="py-2.5 text-end font-medium text-ink-600">{fmt((l.qty || 0) * (l.rate || 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-56 space-y-1.5 text-sm">
            <div className="flex justify-between text-ink-500"><span>{strings.subtotal}</span><span>{fmt(subtotal)} {currency}</span></div>
            {vatEnabled && <div className="flex justify-between text-ink-500"><span>{strings.vat} ({vatRate}%)</span><span>{fmt(vat)} {currency}</span></div>}
            <div className="flex justify-between font-bold text-ink-500 text-base border-t-2 border-ink-100 pt-1.5"><span>{strings.total}</span><span>{fmt(total)} {currency}</span></div>
          </div>
        </div>

        {notes && <div className="mt-8 pt-4 border-t border-cream-100 text-xs text-ink-400"><span className="font-semibold">{strings.notes}: </span>{notes}</div>}
        <div className="mt-8 text-center text-[10px] text-ink-200">Generated free with Paper &amp; Pen · paperandpen.om</div>
      </div>
    </div>
  );
}
