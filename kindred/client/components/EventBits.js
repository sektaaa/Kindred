'use client';

import { useT } from '@/context/LanguageContext';

export function PhaseBadge({ phase }) {
  const { t } = useT();
  return <span className={`phase phase-${phase}`}>{phase === 'live' && <span className="live-dot" />}{t(`phase.${phase}`)}</span>;
}

export function fmtEventDate(d, lang) {
  return new Date(d).toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function timeAgoT(d, lang) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(lang === 'hi' ? 'hi' : 'en', { numeric: 'auto' });
  if (s < 60) return rtf.format(0, 'second');
  if (s < 3600) return rtf.format(-Math.floor(s / 60), 'minute');
  if (s < 86400) return rtf.format(-Math.floor(s / 3600), 'hour');
  return rtf.format(-Math.floor(s / 86400), 'day');
}
