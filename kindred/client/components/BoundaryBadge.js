'use client';

import { useT } from '@/context/LanguageContext';

// Small reusable tag list. kind: 'value' | 'boundary' | 'sensory' | 'identity' | 'interest'
export default function BoundaryBadge({ items = [], kind = 'value' }) {
  const { tag } = useT();
  if (!items.length) return null;
  const cls = { value: '', boundary: 'tag-boundary', sensory: 'tag-sensory', identity: 'tag-identity', interest: 'tag-interest' }[kind];
  return (
    <div className="tags">
      {items.map((v) => (
        <span key={v} className={`tag ${cls}`}>{tag(v)}</span>
      ))}
    </div>
  );
}
