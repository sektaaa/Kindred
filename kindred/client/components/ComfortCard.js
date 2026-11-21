'use client';

import { useT } from '@/context/LanguageContext';
import BoundaryBadge from './BoundaryBadge';

// "How to talk to me" — communication accommodations made visible up front.
export default function ComfortCard({ profile, title }) {
  const { t } = useT();
  const cs = profile.commStyle || {};
  return (
    <div className="comfort">
      <div className="section-label">{title || t('comfort.title')}</div>
      <ul style={{ margin: '0 0 0.5rem', paddingLeft: '1.2rem' }}>
        <li>{cs.prefersText === false ? t('comfort.calls') : t('comfort.text')}</li>
        <li>{t(`comfort.pace.${cs.replyPace || 'same day'}`)}</li>
        <li>{t('comfort.style')}: {t(`comfort.direct.${cs.directness || 'medium'}`)}</li>
      </ul>
      <BoundaryBadge items={profile.sensoryPrefs} kind="sensory" />
    </div>
  );
}
