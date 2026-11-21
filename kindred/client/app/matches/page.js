'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Protected from '@/components/Protected';
import Avatar from '@/components/Avatar';
import { api, errorText } from '@/lib/api';
import { useT } from '@/context/LanguageContext';

function Matches() {
  const { t } = useT();
  const [matches, setMatches] = useState(null);
  const [likes, setLikes] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/matches').then(setMatches).catch((e) => setError(errorText(e)));
    api('/likes/received').then(setLikes).catch(() => {});
  }, []);

  return (
    <div className="stack narrow">
      <h1>{t('matches.your')} <span className="grad-text">{t('matches.title')}</span></h1>
      {error && <div className="error" role="alert">{error}</div>}

      {likes && likes.count > 0 && (
        <div className="card">
          <strong>{likes.count === 1 ? t('matches.likedYouOne') : t('matches.likedYou', { n: likes.count })}</strong>
          {likes.locked ? (
            <p className="muted small" style={{ margin: '0.25rem 0 0' }}>
              {t('matches.upgradeSee')} <Link href="/profile">{t('matches.upgrade')}</Link>
            </p>
          ) : (
            <div className="row" style={{ marginTop: '0.5rem' }}>
              {likes.profiles.map((p) => (
                <div key={p.id} className="row small"><Avatar profile={p} size={36} /> {p.name}</div>
              ))}
              <Link href="/discover" className="small">{t('matches.findThem')}</Link>
            </div>
          )}
        </div>
      )}

      {!matches && !error && <p className="muted">…</p>}
      {matches?.length === 0 && (
        <div className="card center">
          <p>{t('matches.none')}</p>
          <Link className="btn" href="/discover">{t('matches.start')}</Link>
        </div>
      )}
      {matches?.map((m, i) => (
        <Link key={m.id} href={`/matches/${m.id}`} className={`card list-item fade-up d${Math.min(i + 1, 4)}`}>
          <Avatar profile={m.profile} size={56} />
          <div style={{ minWidth: 0 }}>
            <strong>{m.profile.name}</strong> <span className="muted small">· {t('matches.compatible', { n: m.compatibility })}</span>
            <div className="muted small" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {m.lastMessage ? `${m.lastMessage.mine ? t('matches.you') : ''}${m.lastMessage.text}` : t('matches.new')}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function MatchesPage() {
  return <Protected><Matches /></Protected>;
}
