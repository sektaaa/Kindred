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
import { api, errorText } from '@/lib/api';

const SWIPE_MS = 420;

function MatchCelebration({ me, match, onClose }) {
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
        <h2 id="match-title" className="match-title grad-text" style={{ margin: 0 }}>It&apos;s a match!</h2>
        <p style={{ margin: 0 }}>You and <strong>{match.profile.name}</strong> liked each other.</p>
        <p className="muted small" style={{ margin: 0 }}>
          {match.profile.commStyle?.prefersText ? 'They prefer text' : 'They are fine with calls'} and reply {match.profile.commStyle?.replyPace}. No pressure to message right away.
        </p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link className="btn" href={`/matches/${match.id}`}><Icon name="chat" size={18} /> Say hello</Link>
          <button className="btn btn-ghost" onClick={onClose}>Keep browsing</button>
        </div>
      </div>
    </div>
  );
}

function Discover() {
  const { user } = useAuth();
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

  if (!feed && !error) return <p className="muted center">Finding people in your community…</p>;
  const current = feed?.[index];
  const cardClass = leaving === 'like' ? 'swipe-right' : leaving === 'pass' ? 'swipe-left' : 'card-enter';

  return (
    <div className="stack">
      {error && <div className="error narrow" role="alert">{error}{error.includes('Upgrade') && <> — <Link href="/profile">upgrade</Link></>}</div>}

      {current ? (
        <>
          <p className="muted center small" style={{ margin: 0 }}>{index + 1} of {feed.length} · ranked by compatibility</p>
          <div className="stage">
            {leaving === 'like' && <div className="burst"><Heart size={140} /></div>}
            {leaving === 'pass' && <div className="nope">Not for me</div>}
            <ProfileCard key={current.profile.id} className={cardClass} profile={current.profile} compatibility={current.compatibility} reasons={current.reasons} />
          </div>
          <div className="actions">
            <div>
              <button className="round round-pass" onClick={() => swipe('pass')} disabled={busy} aria-label="Not for me">
                <Icon name="x" size={30} />
              </button>
              <span className="action-label">Pass</span>
            </div>
            <div>
              <button className="round round-like" onClick={() => swipe('like')} disabled={busy} aria-label="Interested">
                <Heart size={38} />
              </button>
              <span className="action-label">Interested</span>
            </div>
          </div>
        </>
      ) : (
        <div className="card narrow center card-enter">
          <div style={{ color: 'var(--primary)' }}><Heart size={48} /></div>
          <h2>You&apos;re all caught up</h2>
          <p className="muted">No more profiles in your community right now. Check your matches or browse events.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link className="btn" href="/matches">See matches</Link>
            <button className="btn btn-ghost" onClick={load}>Refresh</button>
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
