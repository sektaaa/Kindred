'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/context/LanguageContext';

const KEY = 'kindred-calm';

// Accessibility: one tap turns off every animation (sensory-friendly for neurodivergent users).
export function isCalm() {
  if (typeof window === 'undefined') return false;
  return document.documentElement.classList.contains('calm') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function CalmToggle() {
  const { t } = useT();
  const [calm, setCalm] = useState(false);

  useEffect(() => {
    let saved = false;
    try { saved = localStorage.getItem(KEY) === '1'; } catch {}
    setCalm(saved);
    document.documentElement.classList.toggle('calm', saved);
  }, []);

  const toggle = () => {
    const next = !calm;
    setCalm(next);
    document.documentElement.classList.toggle('calm', next);
    try { localStorage.setItem(KEY, next ? '1' : '0'); } catch {}
  };

  return (
    <button type="button" className="calm-toggle" aria-pressed={calm} onClick={toggle} title="Turn animations off or on">
      {calm ? t('nav.calmOn') : t('nav.calm')}
    </button>
  );
}
