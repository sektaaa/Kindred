'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/context/LanguageContext';
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
  { key: 'sober', icon: 'sparkle' },
  { key: 'eco', icon: 'leaf' },
  { key: 'neurodiverse', icon: 'chat' },
];

const FEATURES = [
  { icon: 'users', key: 'f1' },
  { icon: 'chat', key: 'f2' },
  { icon: 'sparkle', key: 'f3' },
  { icon: 'shield', key: 'f4' },
];

export default function Home() {
  const { user } = useAuth();
  const { t } = useT();
  return (
    <div className="stack">
      <section className="hero center">
        {HEARTS.map((h, i) => (
          <span key={i} className="float-heart" style={{ left: h.left, animationDuration: `${h.dur}s`, animationDelay: `${h.delay}s` }}>
            <Heart size={h.size} />
          </span>
        ))}
        <div className="hero-content">
          <div className="row" style={{ justifyContent: 'center', marginBottom: '1rem' }}>
            <span className="tag" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
              <Heart size={14} /> {t('home.badge')}
            </span>
          </div>
          <h1>{t('home.title1')} <em>{t('home.title2')}</em></h1>
          <p>{t('home.lead')}</p>
          <div className="row" style={{ justifyContent: 'center', marginTop: '2rem' }}>
            {user ? (
              <Link href={user.role === 'admin' ? '/admin' : '/discover'} className="btn btn-lg"><Heart size={20} /> {t('home.ctaUser')}</Link>
            ) : (
              <>
                <Link href="/signup" className="btn btn-lg"><Heart size={20} /> {t('home.cta')}</Link>
                <Link href="/login" className="btn btn-ghost btn-lg">{t('home.login')}</Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section style={{ marginTop: '2.5rem' }}>
        <h2 className="center" style={{ fontSize: '2rem' }}>{t('home.communitiesTitle')} <span className="grad-text">{t('home.communitiesTitle2')}</span></h2>
        <div className="grid grid-3" style={{ marginTop: '1.25rem' }}>
          {COMMUNITIES.map((c, i) => (
            <div key={c.key} className={`card lift fade-up d${i + 1}`}>
              <div className="feature-icon"><Icon name={c.icon} /></div>
              <span className={`community community-${c.key}`}>{t(`community.${c.key}.label`)}</span>
              <p style={{ marginTop: '0.75rem', marginBottom: 0 }}>{t(`home.${c.key}.text`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: '2.5rem' }}>
        <h2 className="center" style={{ fontSize: '2rem' }}>{t('home.builtTitle')} <span className="grad-text">{t('home.builtTitle2')}</span></h2>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginTop: '1.25rem' }}>
          {FEATURES.map((f, i) => (
            <div key={f.key} className={`card lift fade-up d${i + 1}`}>
              <div className="feature-icon"><Icon name={f.icon} /></div>
              <h3 style={{ fontSize: '1.05rem' }}>{t(`home.${f.key}.title`)}</h3>
              <p className="muted" style={{ margin: 0 }}>{t(`home.${f.key}.text`)}</p>
            </div>
          ))}
        </div>
      </section>

      {!user && (
        <section className="card center fade-up" style={{ marginTop: '2.5rem', background: 'var(--grad-soft)' }}>
          <h2>{t('home.endTitle')}</h2>
          <p className="muted">{t('home.endText')}</p>
          <Link href="/signup" className="btn btn-lg"><Heart size={20} /> {t('home.endCta')}</Link>
        </section>
      )}
    </div>
  );
}
