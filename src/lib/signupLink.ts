/*
 * The signup query an industry page carries (FU-4127): its starter pack and
 * the modules to pre-select. paperandpen.om/signup reads both
 * (SignupForm parseTemplate / parseModules) and forwards them to the backend.
 * Grammar: ?template=<pack id>&modules=<comma list, no spaces>.
 */
export function signupQuery(template?: string, modules?: string[]): string {
  const parts: string[] = [];
  if (template) parts.push(`template=${encodeURIComponent(template)}`);
  if (modules && modules.length) parts.push(`modules=${modules.map(encodeURIComponent).join(',')}`);
  return parts.length ? `?${parts.join('&')}` : '';
}
