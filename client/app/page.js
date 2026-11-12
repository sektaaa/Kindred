'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Heart from '@/components/Heart';
import Icon from '@/components/Icon';

// Fixed positions so server and client render the same markup.
const HEARTS = [
  { left: '5%', size: 22, dur: 9, delay: 0 },
  { left: '14%', size: 34, dur: 12, delay: 2 },
  { left: '24%', size: 18, dur: 8, delay: 4 },
  { left: '36%', size: 28, dur: 11, delay: 1 },
  { left: '48%', size: 16, dur: 9, delay: 5 },
  { left: '58%', size: 38, dur: 13, delay: 3 },
  { left: '68%', size: 20, dur: 10, delay: 0.5 },
  { left: '78%', size: 30, dur: 12, delay: 6 },
  { left: '88%', size: 24, dur: 9, delay: 2.5 },
  { left: '95%', size: 18, dur: 11, delay: 4.5 },
];

const COMMUNITIES = [
  { key: 'sober', icon: 'sparkle', title: 'Sober & alcohol-free', text: 'Coffee dates, sunrise runs and nights out that never revolve around a drink.' },
  { key: 'eco', icon: 'leaf', title: 'Eco & vegan', text: 'Fall for someone who cares about the planet as much as you do.' },
  { key: 'neurodiverse', icon: 'chat', title: 'Neurodiverse', text: 'Date in your own communication style — no guessing games, no pressure.' },
];

const FEATURES = [
  { icon: 'users', title: 'Your own community', text: 'Only see people who share your lifestyle.' },
  { icon: 'chat', title: '“How to talk to me”', text: 'Reply pace, directness and sensory needs, up front.' },
  { icon: 'sparkle', title: 'Matches that explain', text: 'See exactly why someone could be your person.' },
  { icon: 'shield', title: 'Privacy first', text: 'Sensitive details stay hidden until you match.' },
];

export default function Home() {
  const { user } = useAuth();
  return (
    <div className="stack" style={{ '--gap': '2rem' }}>
      <section className="hero center">
        {HEARTS.map((h, i) => (
          <span key={i} className="float-heart" style={{ left: h.left, animationDuration: `${h.dur}s`, animationDelay: `${h.delay}s` }}>
            <Heart size={h.size} />
          </span>
        ))}
        <div className="hero-content">
          <div className="row" style={{ justifyContent: 'center', marginBottom: '1rem' }}>
            <span className="tag" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
              <Heart size={14} /> Love that fits your life
            </span>
          </div>
          <h1>Find someone who <em>already gets you.</em></h1>
          <p>Kindred is dating for sober, eco-conscious and neurodivergent people — where your values are the foundation, not a filter.</p>
          <div className="row" style={{ justifyContent: 'center', marginTop: '2rem' }}>
            {user ? (
              <Link href="/discover" className="btn btn-lg"><Heart size={20} /> Start matching</Link>
            ) : (
              <>
                <Link href="/signup" className="btn btn-lg"><Heart size={20} /> Find your person</Link>
                <Link href="/login" className="btn btn-ghost btn-lg">Log in</Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section style={{ marginTop: '2.5rem' }}>
        <h2 className="center" style={{ fontSize: '2rem' }}>Three communities. <span className="grad-text">One kind of love.</span></h2>
        <div className="grid grid-3" style={{ marginTop: '1.25rem' }}>
          {COMMUNITIES.map((c, i) => (
            <div key={c.key} className={`card lift fade-up d${i + 1}`}>
              <div className="feature-icon"><Icon name={c.icon} /></div>
              <span className={`community community-${c.key}`}>{c.title}</span>
              <p style={{ marginTop: '0.75rem', marginBottom: 0 }}>{c.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: '2.5rem' }}>
        <h2 className="center" style={{ fontSize: '2rem' }}>Dating, <span className="grad-text">built differently</span></h2>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginTop: '1.25rem' }}>
          {FEATURES.map((f, i) => (
            <div key={f.title} className={`card lift fade-up d${i + 1}`}>
              <div className="feature-icon"><Icon name={f.icon} /></div>
              <h3 style={{ fontSize: '1.05rem' }}>{f.title}</h3>
              <p className="muted" style={{ margin: 0 }}>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {!user && (
        <section className="card center fade-up" style={{ marginTop: '2.5rem', background: 'var(--grad-soft)' }}>
          <h2>Your person is out there.</h2>
          <p className="muted">Join free in under a minute.</p>
          <Link href="/signup" className="btn btn-lg"><Heart size={20} /> Create my profile</Link>
        </section>
      )}
    </div>
  );
}
