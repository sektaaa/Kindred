'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Protected from '@/components/Protected';
import ProfileCard from '@/components/ProfileCard';
import Avatar from '@/components/Avatar';
import Heart from '@/components/Heart';
import Icon from '@/components/Icon';
import { isCalm } from '@/components/CalmToggle';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/context/LanguageContext';
import { api, errorText } from '@/lib/api';

const SWIPE_MS = 420;

function MatchCelebration({ me, match, onClose }) {
  const { t, tag } = useT();
  // Hearts rising behind the modal; fixed values so nothing jumps on re-render.
  const confetti = useMemo(
    () => Array.from({ length: 18 }, (_, i) => ({ left: `${(i * 37) % 100}%`, size: 14 + ((i * 7) % 22), dur: 2.6 + ((i * 3) % 10) / 4, delay: (i % 6) * 0.25 })),
    []
  );
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="match-title">
      {confetti.map((c, i) => (
        <span key={i} className="confetti" style={{ left: c.left, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s`, color: i % 3 ? '#ff8fa3' : '#ffffff' }}>
          <Heart size={c.size} />
        </span>
      ))}
      <div className="card modal center stack">
        <div className="match-avatars">
          <span className="left"><Avatar profile={me} size={92} /></span>
          <span className="mid"><Heart size={26} /></span>
          <span className="right"><Avatar profile={match.profile} size={92} /></span>
        </div>
        <h2 id="match-title" className="match-title grad-text" style={{ margin: 0 }}>{t('match.title')}</h2>
        <p style={{ margin: 0 }}>{t('match.text', { name: match.profile.name })}</p>
        <p className="muted small" style={{ margin: 0 }}>
          {match.profile.commStyle?.prefersText ? t('match.prefersText') : t('match.fineCalls')} {t('match.reply', { pace: tag(match.profile.commStyle?.replyPace || 'same day') })}
        </p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link className="btn" href={`/matches/${match.id}`}><Icon name="chat" size={18} /> {t('match.hello')}</Link>
          <button className="btn btn-ghost" onClick={onClose}>{t('match.keep')}</button>
        </div>
      </div>
    </div>
  );
}

function Discover() {
  const { user } = useAuth();
  const { t } = useT();
  const [feed, setFeed] = useState(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [match, setMatch] = useState(null);
  const [leaving, setLeaving] = useState(null); // 'like' | 'pass' | null

  const load = useCallback(async () => {
    setError('');
    try {
      setFeed(await api('/discover'));
      setIndex(0);
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const swipe = async (action) => {
    const current = feed[index];
    setBusy(true);
    setError('');
    try {
      const res = await api('/swipes', { method: 'POST', body: { toUser: current.profile.id, action } });
      setLeaving(action);
      await new Promise((r) => setTimeout(r, isCalm() ? 0 : SWIPE_MS));
      setLeaving(null);
      setIndex((i) => i + 1);
      if (res.matched) setMatch({ id: res.matchId, profile: res.profile });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (!feed && !error) return <p className="muted center">{t('discover.finding')}</p>;
  const current = feed?.[index];
  const cardClass = leaving === 'like' ? 'swipe-right' : leaving === 'pass' ? 'swipe-left' : 'card-enter';

  return (
    <div className="stack">
      {error && <div className="error narrow" role="alert">{error}{error.includes('Upgrade') && <> — <Link href="/profile">{t('discover.upgrade')}</Link></>}</div>}

      {current ? (
        <>
          <p className="muted center small" style={{ margin: 0 }}>{t('discover.count', { n: index + 1, total: feed.length })}</p>
          <div className="stage">
            {leaving === 'like' && <div className="burst"><Heart size={140} /></div>}
            {leaving === 'pass' && <div className="nope">{t('discover.notForMe')}</div>}
            <ProfileCard key={current.profile.id} className={cardClass} profile={current.profile} compatibility={current.compatibility} reasons={current.reasons} />
          </div>
          <div className="actions">
            <div>
              <button className="round round-pass" onClick={() => swipe('pass')} disabled={busy} aria-label="Not for me">
                <Icon name="x" size={30} />
              </button>
              <span className="action-label">{t('discover.pass')}</span>
            </div>
            <div>
              <button className="round round-like" onClick={() => swipe('like')} disabled={busy} aria-label="Interested">
                <Heart size={38} />
              </button>
              <span className="action-label">{t('discover.interested')}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="card narrow center card-enter">
          <div style={{ color: 'var(--primary)' }}><Heart size={48} /></div>
          <h2>{t('discover.caughtUp')}</h2>
          <p className="muted">{t('discover.caughtUpText')}</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link className="btn" href="/matches">{t('discover.seeMatches')}</Link>
            <button className="btn btn-ghost" onClick={load}>{t('discover.refresh')}</button>
          </div>
        </div>
      )}

      {match && <MatchCelebration me={{ ...user.profile, community: user.community }} match={match} onClose={() => setMatch(null)} />}
    </div>
  );
}

export default function DiscoverPage() {
  return <Protected><Discover /></Protected>;
}
