'use client';

import { useT } from '@/context/LanguageContext';

export default function CommunityBadge({ community }) {
  const { t } = useT();
  if (!community) return null;
  return <span className={`community community-${community}`}>{t(`community.${community}`)}</span>;
}
