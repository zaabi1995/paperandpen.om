import { useState, useEffect, useRef } from 'react';
import { checkSubdomainAvailability } from '@/lib/api';
import { MAX_SUBDOMAIN_LENGTH, sanitizeSubdomainInput } from '@/lib/utils';

interface Strings {
  label: string;
  placeholder: string;
  suffix: string;
  checking: string;
  available: string;
  taken: string;
  error: string;
  cta: string;
}

interface Props {
  strings: Strings;
  signupBase: string; // localized /signup path
  rtl?: boolean;
}

export default function SubdomainChecker({ strings, signupBase, rtl = false }: Props) {
  const [input, setInput] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [err, setErr] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const slug = sanitizeSubdomainInput(input);
    setSubdomain(slug);
    setErr('');
    if (!slug) {
      setStatus('idle');
      return;
    }
    setStatus('checking');
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const { available } = await checkSubdomainAvailability(slug);
        setStatus(available ? 'available' : 'taken');
      } catch {
        setStatus('idle');
        setErr(strings.error);
      }
    }, 600);
    return () => clearTimeout(timer.current);
  }, [input]);

  const signupLink = subdomain ? `${signupBase}?subdomain=${subdomain}` : signupBase;

  return (
    <div dir={rtl ? 'rtl' : 'ltr'}>
      <label className="block text-xs font-semibold text-ink-500/50 mb-2 tracking-widest uppercase">{strings.label}</label>
      <div
        className={`flex items-stretch rounded-xl border-2 bg-white shadow-sm overflow-hidden transition-all ${
          status === 'available'
            ? 'border-emerald-400'
            : status === 'taken'
            ? 'border-red-400'
            : 'border-cream-300 focus-within:border-ink-500'
        }`}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(sanitizeSubdomainInput(e.target.value, MAX_SUBDOMAIN_LENGTH))}
          placeholder={strings.placeholder}
          className="flex-1 px-4 py-3.5 text-ink-500 placeholder-ink-200 text-sm outline-none bg-transparent font-medium"
          maxLength={50}
          aria-label={strings.label}
        />
        <span className="flex items-center px-4 bg-cream-100 text-ink-400 text-sm border-s border-cream-200 select-none font-medium whitespace-nowrap">
          {strings.suffix}
        </span>
      </div>
      <div className="h-5 mt-1.5">
        {status === 'checking' && <p className="text-xs text-ink-400">{strings.checking}</p>}
        {status === 'available' && <p className="text-xs text-emerald-600 font-medium">✓ {subdomain}{strings.suffix} {strings.available}</p>}
        {status === 'taken' && <p className="text-xs text-red-500">{subdomain}{strings.suffix} {strings.taken}</p>}
        {err && <p className="text-xs text-red-500">{err}</p>}
      </div>
      <a
        href={signupLink}
        className="mt-3 inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-ink-500 text-cream-50 font-semibold rounded-xl hover:bg-ink-700 transition-all shadow-lg shadow-ink-500/20 hover:-translate-y-0.5 w-full sm:w-auto"
      >
        {strings.cta}
        <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7l7 7-7 7" />
        </svg>
      </a>
    </div>
  );
}
