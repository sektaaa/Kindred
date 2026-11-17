'use client';

import { useCallback, useEffect, useState } from 'react';
import CommunityBadge from '@/components/CommunityBadge';
import { api, errorText } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';

const EMPTY = { community: 'sober', title: '', description: '', city: '', venue: '', date: '', sponsor: '', featured: false };

export default function AdminEvents() {
  const [events, setEvents] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api('/admin/events').then(setEvents).catch((e) => setError(errorText(e))), []);
  useEffect(() => { load(); }, [load]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const act = async (fn) => {
    setBusy(true); setError('');
    try { await fn(); await load(); return true; } catch (e) { setError(errorText(e)); return false; } finally { setBusy(false); }
  };

  const create = async (e) => {
    e.preventDefault();
    if (!form.title || !form.date) return setError('Title and date are required');
    const ok = await act(() => api('/admin/events', { method: 'POST', body: { ...form, date: new Date(form.date).toISOString() } }));
    if (ok) setForm(EMPTY);
  };

  const now = Date.now();

  return (
    <div className="stack">
      <div>
        <h1 style={{ marginBottom: 0 }}>Events</h1>
        <p className="muted" style={{ margin: 0 }}>Members see upcoming events for their own community. Featured events show first.</p>
      </div>
      {error && <div className="error" role="alert">{error}</div>}

      <form className="card" onSubmit={create} noValidate>
        <h3>Add an event</h3>
        <div className="row">
          <label className="field" style={{ flex: 2 }}><span>Title</span><input value={form.title} onChange={set('title')} maxLength={120} /></label>
          <label className="field" style={{ flex: 1 }}><span>Community</span>
            <select value={form.community} onChange={set('community')}><option value="sober">Sober</option><option value="eco">Eco &amp; vegan</option><option value="neurodiverse">Neurodiverse</option></select>
          </label>
          <label className="field" style={{ flex: 1 }}><span>Date and time</span><input type="datetime-local" value={form.date} onChange={set('date')} /></label>
        </div>
        <div className="row">
          <label className="field" style={{ flex: 1 }}><span>City</span><input value={form.city} onChange={set('city')} /></label>
          <label className="field" style={{ flex: 1 }}><span>Venue</span><input value={form.venue} onChange={set('venue')} /></label>
          <label className="field" style={{ flex: 1 }}><span>Sponsor (optional)</span><input value={form.sponsor} onChange={set('sponsor')} /></label>
        </div>
        <label className="field"><span>Description</span><textarea value={form.description} onChange={set('description')} maxLength={1000} /></label>
        <div className="row">
          <label className="row"><input type="checkbox" style={{ width: 20, height: 20 }} checked={form.featured} onChange={set('featured')} /> Featured (paid listing)</label>
          <div className="spacer" />
          <button className="btn" disabled={busy}>Add event</button>
        </div>
      </form>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="table">
          <thead><tr><th>Event</th><th>Community</th><th>When</th><th>Where</th><th>Featured</th><th></th></tr></thead>
          <tbody>
            {!events && <tr><td colSpan={6} className="muted">Loading…</td></tr>}
            {events?.length === 0 && <tr><td colSpan={6} className="muted">No events yet.</td></tr>}
            {events?.map((ev) => (
              <tr key={ev._id} style={new Date(ev.date).getTime() < now ? { opacity: 0.55 } : undefined}>
                <td><b>{ev.title}</b>{ev.sponsor && <div className="muted small">Sponsored by {ev.sponsor}</div>}</td>
                <td><CommunityBadge community={ev.community} /></td>
                <td className="muted">{fmtDateTime(ev.date)}{new Date(ev.date).getTime() < now && <div className="small">past</div>}</td>
                <td className="muted">{[ev.venue, ev.city].filter(Boolean).join(', ')}</td>
                <td>
                  <input type="checkbox" aria-label="Featured" style={{ width: 20, height: 20 }} checked={ev.featured} disabled={busy}
                    onChange={(e) => act(() => api(`/admin/events/${ev._id}`, { method: 'PATCH', body: { featured: e.target.checked } }))} />
                </td>
                <td>
                  <button className="linklike small" style={{ color: 'var(--primary)' }} disabled={busy}
                    onClick={() => window.confirm(`Delete "${ev.title}"?`) && act(() => api(`/admin/events/${ev._id}`, { method: 'DELETE' }))}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
