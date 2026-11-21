import en from './en';
import hi from './hi';

// To add a language: create ./<code>.js with the same keys as en.js
// (missing keys fall back to English) and add it here.
export const LANGUAGES = {
  en: { label: 'English', dict: en },
  hi: { label: 'हिन्दी', dict: hi },
};

export const DEFAULT_LANG = 'en';

export function translate(lang, key, vars) {
  const dict = LANGUAGES[lang]?.dict || en;
  let s = dict[key] ?? en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}
