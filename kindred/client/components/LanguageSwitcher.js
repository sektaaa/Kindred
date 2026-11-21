'use client';

import { useT } from '@/context/LanguageContext';
import { LANGUAGES } from '@/lib/i18n';

export default function LanguageSwitcher() {
  const { lang, setLang, t } = useT();
  return (
    <label className="lang-switch" title={t('nav.language')}>
      <span aria-hidden="true">🌐</span>
      <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t('nav.language')}>
        {Object.entries(LANGUAGES).map(([code, l]) => (
          <option key={code} value={code}>{l.label}</option>
        ))}
      </select>
    </label>
  );
}
