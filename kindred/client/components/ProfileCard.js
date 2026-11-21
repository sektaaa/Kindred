'use client';

import { useT } from '@/context/LanguageContext';
import Avatar from './Avatar';
import BoundaryBadge from './BoundaryBadge';
import ComfortCard from './ComfortCard';
import Heart from './Heart';

// Profile with the "why you match" explanation — the core demo moment.
export default function ProfileCard({ profile, compatibility, reasons = [], children, className = '' }) {
  const { t, tag, list } = useT();

  // Server sends structured reasons; turn them into a sentence in the chosen language.
  const reasonText = (r) =>
    typeof r === 'string' ? r : r.items ? t(`reason.${r.type}`, { items: list(r.items) }) : t(`reason.${r.type}`, { value: tag(r.value) });

  return (
    <article className={`card profile-card ${className}`} aria-label={profile.name}>
      <div className="profile-cover" />
      <div className="profile-body">
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <Avatar profile={profile} size={96} />
          <div style={{ paddingBottom: '0.3rem' }}>
            <h2 style={{ marginBottom: 0 }}>{profile.name}, {profile.age}</h2>
            <div className="muted">{profile.city} · {t('card.lookingFor')} {tag(profile.lookingFor)}</div>
          </div>
          <div className="spacer" />
          {typeof compatibility === 'number' && (
            <div className="score-ring" style={{ '--p': compatibility }} aria-label={`${compatibility}%`}>
              <span>{compatibility}%<small>{t('card.match')}</small></span>
            </div>
          )}
        </div>

        {reasons.length > 0 && (
          <div className="why">
            <strong><Heart size={16} /> {t('card.why')}</strong>
            <ul>{reasons.map((r, i) => <li key={i}>{reasonText(r)}</li>)}</ul>
          </div>
        )}

        {profile.bio && <p style={{ margin: 0, fontSize: '1.05rem' }}>&ldquo;{profile.bio}&rdquo;</p>}

        {profile.interests?.length > 0 && (
          <div>
            <div className="section-label">{t('card.interests')}</div>
            <BoundaryBadge items={profile.interests} kind="interest" />
          </div>
        )}
        <div>
          <div className="section-label">{t('card.values')}</div>
          <BoundaryBadge items={profile.values} />
        </div>
        {profile.boundaries?.length > 0 && (
          <div>
            <div className="section-label">{t('card.boundaries')}</div>
            <BoundaryBadge items={profile.boundaries} kind="boundary" />
          </div>
        )}
        <ComfortCard profile={profile} />
        {profile.identityTags?.length > 0 && (
          <div>
            <div className="section-label">{t('card.identity')}</div>
            <BoundaryBadge items={profile.identityTags} kind="identity" />
          </div>
        )}
        {profile.identityTagsHidden && <p className="small muted" style={{ margin: 0 }}>{t('card.hiddenIdentity')}</p>}

        {children}
      </div>
    </article>
  );
}
