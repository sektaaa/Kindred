'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { LANGUAGES, DEFAULT_LANG, translate } from '@/lib/i18n';

const KEY = 'kindred-lang';
const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(DEFAULT_LANG);

  // Saved choice first, else the browser's language if we support it.
  useEffect(() => {
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch {}
    const browser = (navigator.language || '').slice(0, 2);
    const initial = saved && LANGUAGES[saved] ? saved : LANGUAGES[browser] ? browser : DEFAULT_LANG;
    setLangState(initial);
  }, []);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const setLang = (l) => {
    if (!LANGUAGES[l]) return;
    setLangState(l);
    try { localStorage.setItem(KEY, l); } catch {}
  };

  const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);

  // Label for a stored tag value such as "alcohol-free" or "music".
  const tag = useCallback((value) => {
    const s = translate(lang, `tag.${value}`);
    return s === `tag.${value}` ? value : s;
  }, [lang]);

  // "a, b and c" in the current language.
  const list = useCallback((items) => {
    const labels = items.map(tag);
    if (labels.length <= 1) return labels.join('');
    return `${labels.slice(0, -1).join(', ')} ${translate(lang, 'list.and')} ${labels.at(-1)}`;
  }, [lang, tag]);

  return <LanguageContext.Provider value={{ lang, setLang, t, tag, list }}>{children}</LanguageContext.Provider>;
}

export const useT = () => useContext(LanguageContext);
