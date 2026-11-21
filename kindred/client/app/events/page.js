'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Protected from '@/components/Protected';
import CommunityBadge from '@/components/CommunityBadge';
import Icon from '@/components/Icon';
import { PhaseBadge, fmtEventDate } from '@/components/EventBits';
import { useT } from '@/context/LanguageContext';
import { api, errorText } from '@/lib/api';

const TABS = ['upcoming', 'past', 'all'];

function Events() {
  const { t, lang } = useT();
  const [when, setWhen] = useState('upcoming');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');

  // Debounced search box.
  useEffect(() => {
    const id = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    setEvents(null);
    const qs = new URLSearchParams({ when });
    if (query) qs.set('search', query);
    api(`/events?${qs}`).then(setEvents).catch((e) => setError(errorText(e)));
  }, [when, query]);

  return (
    <div className="stack">
      <div className="events-search card">
        <Icon name="search" />
        <input type="search" placeholder={t('events.search')} value={search} onChange={(e) => setSearch(e.target.value)} aria-label={t('events.search')} />
      </div>

      <div>
        <h1 style={{ marginBottom: '0.25rem' }}>{t('events.title')}</h1>
        <p className="muted" style={{ margin: 0 }}>{t('events.lead')}</p>
      </div>

      <div className="seg" role="group" style={{ alignSelf: 'flex-start' }}>
        {TABS.map((k) => (
          <button key={k} type="button" aria-pressed={when === k} onClick={() => setWhen(k)}>{t(`events.${k}`)}</button>
        ))}
      </div>

      {error && <div className="error">{error}</div>}
      {!events && !error && <p className="muted">…</p>}
      {events?.length === 0 && <div className="card center muted">{t('events.none')}</div>}

      <div className="event-grid">
        {events?.map((e, i) => (
          <Link key={e.id} href={`/events/${e.id}`} className={`card event-card lift fade-up d${Math.min(i + 1, 4)}`}>
            <div className="event-cover" style={e.coverUrl ? { backgroundImage: `url(${e.coverUrl})` } : undefined}>
              <div className="event-cover-badges">
                <PhaseBadge phase={e.phase} />
                {e.featured && <span className="phase phase-featured">{t('events.featured')}</span>}
              </div>
            </div>
            <div className="event-card-body">
              <div className="small muted">{fmtEventDate(e.date, lang)}</div>
              <h3 style={{ margin: '0.2rem 0' }}>{e.title}</h3>
              <div className="small muted">{[e.venue, e.city].filter(Boolean).join(', ')}</div>
              <div className="event-stats">
                <span>{e.counts.going} {t('events.going')}</span>
                {e.counts.attended > 0 && <span>{e.counts.attended} {t('events.attended')}</span>}
                <span>♥ {e.counts.likes}</span>
                <span>{e.counts.comments} {t('events.comments')}</span>
                {e.counts.photos > 0 && <span>{e.counts.photos} {t('events.photos')}</span>}
              </div>
              {e.counts.myRsvp && <span className="tag" style={{ marginTop: '0.5rem' }}>{t(`rsvp.${e.counts.myRsvp}`)}</span>}
              <div style={{ marginTop: '0.5rem' }}><CommunityBadge community={e.community} /></div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function EventsPage() {
  return <Protected><Events /></Protected>;
}
