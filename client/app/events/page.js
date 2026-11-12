'use client';

import { useEffect, useState } from 'react';
import Protected from '@/components/Protected';
import { api, errorText } from '@/lib/api';

function Events() {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/events').then(setEvents).catch((e) => setError(errorText(e)));
  }, []);

  return (
    <div className="stack narrow">
      <h1>Events for your community</h1>
      <p className="muted">Curated, values-aligned meetups — every one fits your community&apos;s norms.</p>
      {error && <div className="error">{error}</div>}
      {!events && !error && <p className="muted">Loading…</p>}
      {events?.length === 0 && <p className="muted">No upcoming events yet.</p>}
      {events?.map((e) => (
        <article key={e._id} className="card">
          <div className="row">
            <h3 style={{ margin: 0 }}>{e.title}</h3>
            {e.featured && <span className="tag tag-identity">Featured</span>}
          </div>
          <div className="muted small">
            {new Date(e.date).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {e.venue}, {e.city}
          </div>
          {e.description && <p style={{ margin: '0.5rem 0 0' }}>{e.description}</p>}
          {e.sponsor && <p className="small muted" style={{ margin: '0.5rem 0 0' }}>Sponsored by {e.sponsor}</p>}
        </article>
      ))}
    </div>
  );
}

export default function EventsPage() {
  return <Protected><Events /></Protected>;
}
