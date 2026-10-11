/*
 * Language names, [in its own script, in English], keyed by URL segment.
 *
 * Zero imports and no dictionaries, so the client-side language switcher can
 * import it without pulling any UI JSON into the browser bundle. LOCALE_META
 * in ./index.ts reads its `label` and `english` from here, so the switcher and
 * the server never disagree on a name.
 */
export const LANGUAGE_NAMES = {
  en: ['English', 'English'],
  ar: ['العربية', 'Arabic'],
  hi: ['हिन्दी', 'Hindi'],
  bn: ['বাংলা', 'Bengali'],
  ur: ['اردو', 'Urdu'],
  es: ['Español', 'Spanish'],
  fr: ['Français', 'French'],
  de: ['Deutsch', 'German'],
  pt: ['Português', 'Portuguese'],
  it: ['Italiano', 'Italian'],
  nl: ['Nederlands', 'Dutch'],
  ru: ['Русский', 'Russian'],
  uk: ['Українська', 'Ukrainian'],
  pl: ['Polski', 'Polish'],
  cs: ['Čeština', 'Czech'],
  sk: ['Slovenčina', 'Slovak'],
  bg: ['Български', 'Bulgarian'],
  tr: ['Türkçe', 'Turkish'],
  fa: ['فارسی', 'Persian'],
  he: ['עברית', 'Hebrew'],
  el: ['Ελληνικά', 'Greek'],
  ro: ['Română', 'Romanian'],
  hu: ['Magyar', 'Hungarian'],
  zh: ['中文(简体)', 'Chinese (Simplified)'],
  'zh-hant': ['中文(繁體)', 'Chinese (Traditional)'],
  ja: ['日本語', 'Japanese'],
  ko: ['한국어', 'Korean'],
  vi: ['Tiếng Việt', 'Vietnamese'],
  th: ['ไทย', 'Thai'],
  id: ['Bahasa Indonesia', 'Indonesian'],
  ms: ['Bahasa Melayu', 'Malay'],
  tl: ['Tagalog', 'Tagalog (Filipino)'],
  sw: ['Kiswahili', 'Swahili'],
  sv: ['Svenska', 'Swedish'],
  no: ['Norsk bokmål', 'Norwegian'],
  da: ['Dansk', 'Danish'],
  fi: ['Suomi', 'Finnish'],
  et: ['Eesti', 'Estonian'],
  lv: ['Latviešu', 'Latvian'],
  lt: ['Lietuvių', 'Lithuanian'],
  sl: ['Slovenščina', 'Slovenian'],
  hr: ['Hrvatski', 'Croatian'],
  sr: ['Српски', 'Serbian'],
  ca: ['Català', 'Catalan'],
  ta: ['தமிழ்', 'Tamil'],
  te: ['తెలుగు', 'Telugu'],
  kn: ['ಕನ್ನಡ', 'Kannada'],
  ml: ['മലയാളം', 'Malayalam'],
  mr: ['मराठी', 'Marathi'],
  gu: ['ગુજરાતી', 'Gujarati'],
  pa: ['ਪੰਜਾਬੀ', 'Punjabi'],
  or: ['ଓଡ଼ିଆ', 'Odia'],
};

/** Right-to-left locales. */
export const RTL_CODES = ['ar', 'ur', 'fa', 'he'];
