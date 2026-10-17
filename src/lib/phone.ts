/*
 * The owner's WhatsApp number on the signup form (17 Oct 2026). The onboarding
 * WhatsApp needs it, and 89 of 103 workspaces had none.
 *
 * The field opens on "+968 " (Oman); a person in another country replaces the
 * code. Same rule as the backend (normalizeSignupPhone in bhd-erp
 * pnpBillingController/signup.js): a bare 8-digit number is Oman, and at least
 * 8 digits must be left.
 */
export const PHONE_PREFIX = '+968 ';

/** "+<digits>", or '' when the value is not a phone number. */
export function normalizePhone(raw: string): string {
  let d = String(raw || '').replace(/\D/g, '').replace(/^00/, '');
  if (d.startsWith('0') && d.length === 9) d = `968${d.slice(1)}`;
  else if (d.length === 8) d = `968${d}`;
  if (d.length < 8 || d.length > 15) return '';
  return `+${d}`;
}

/** The error key for the field, or null when the number is good. */
export function phoneProblem(raw: string): 'phoneRequired' | 'phoneInvalid' | null {
  const d = String(raw || '').replace(/\D/g, '');
  if (!d || d === '968') return 'phoneRequired';
  return normalizePhone(raw) ? null : 'phoneInvalid';
}
