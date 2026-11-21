'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Protected from '@/components/Protected';
import CommunityBadge from '@/components/CommunityBadge';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import { PhaseBadge, fmtEventDate, timeAgoT } from '@/components/EventBits';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/context/LanguageContext';
import { api, apiUpload, errorText } from '@/lib/api';
import { compressImage } from '@/lib/image';

const toLocalInput = (d) => {
  if (!d) return '';
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

// ---------- Admin: edit the event in place ----------
function EditEvent({ event, onSaved, onCancel }) {
  const [f, setF] = useState({
    title: event.title, description: event.description || '', venue: event.venue || '', city: event.city || '',
    sponsor: event.sponsor || '', date: toLocalInput(event.date), endDate: toLocalInput(event.endDate),
    capacity: event.capacity || '', status: event.status, featured: event.featured,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const body = { ...f, date: new Date(f.date).toISOString(), endDate: f.endDate ? new Date(f.endDate).toISOString() : null, capacity: f.capacity ? Number(f.capacity) : null };
      await api(`/admin/events/${event.id}`, { method: 'PATCH', body });
      onSaved();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card" onSubmit={save}>
      <h3>Edit event</h3>
      {error && <div className="error">{error}</div>}
      <div className="row">
        <label className="field" style={{ flex: 2 }}><span>Title</span><input value={f.title} onChange={set('title')} maxLength={120} /></label>
        <label className="field" style={{ flex: 1 }}><span>Status</span>
          <select value={f.status} onChange={set('status')}><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
        </label>
      </div>
      <div className="row">
        <label className="field" style={{ flex: 1 }}><span>Starts</span><input type="datetime-local" value={f.date} onChange={set('date')} /></label>
        <label className="field" style={{ flex: 1 }}><span>Ends (optional)</span><input type="datetime-local" value={f.endDate} onChange={set('endDate')} /></label>
        <label className="field" style={{ flex: 1 }}><span>Capacity (optional)</span><input type="number" min={1} value={f.capacity} onChange={set('capacity')} /></label>
      </div>
      <div className="row">
        <label className="field" style={{ flex: 1 }}><span>Venue</span><input value={f.venue} onChange={set('venue')} /></label>
        <label className="field" style={{ flex: 1 }}><span>City</span><input value={f.city} onChange={set('city')} /></label>
        <label className="field" style={{ flex: 1 }}><span>Sponsor</span><input value={f.sponsor} onChange={set('sponsor')} /></label>
      </div>
      <label className="field"><span>Description</span><textarea value={f.description} onChange={set('description')} maxLength={1000} /></label>
      <div className="row">
        <label className="row"><input type="checkbox" style={{ width: 20, height: 20 }} checked={f.featured} onChange={set('featured')} /> Featured</label>
        <div className="spacer" />
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </div>
    </form>
  );
}

// ---------- Attendance ----------
function Attendance({ data, isAdmin, onMark }) {
  const { t } = useT();
  const { attendees, event } = data;
  const ended = ['ended', 'completed'].includes(event.phase);
  const groups = [
    { key: 'came', label: t('event.whoCame'), list: attendees.filter((a) => a.attendance === 'attended'), cls: 'ok' },
    ...(isAdmin ? [{ key: 'noshow', label: t('event.whoNoShow'), list: attendees.filter((a) => a.attendance === 'no_show'), cls: 'warn' }] : []),
    { key: 'going', label: ended && isAdmin ? `${t('event.whoGoing')} · ${t('event.whoPending')}` : t('event.whoGoing'), list: attendees.filter((a) => a.rsvp === 'going' && a.attendance === 'pending') },
    { key: 'interested', label: t('event.whoInterested'), list: attendees.filter((a) => a.rsvp === 'interested' && a.attendance === 'pending') },
    ...(isAdmin ? [{ key: 'not', label: t('event.whoNotGoing'), list: attendees.filter((a) => a.rsvp === 'not_going' && a.attendance === 'pending') }] : []),
  ];

  return (
    <section className="card">
      <h3 style={{ marginBottom: 0 }}>{t('event.attendance')}</h3>
      <p className="muted small" style={{ marginTop: 0 }}>{t('event.attendanceLead')}</p>
      <div className="att-stats">
        <div><b>{event.counts.going}</b><span>{t('event.whoGoing')}</span></div>
        <div><b>{event.counts.interested}</b><span>{t('event.whoInterested')}</span></div>
        <div className="ok"><b>{event.counts.attended}</b><span>{t('event.whoCame')}</span></div>
        {isAdmin && <div className="warn"><b>{event.counts.noShow}</b><span>{t('event.whoNoShow')}</span></div>}
      </div>
      {groups.map((g) => (
        <div key={g.key} className="att-group">
          <div className="section-label">{g.label} ({g.list.length})</div>
          {g.list.length === 0 ? <p className="muted small" style={{ margin: 0 }}>{t('event.nobody')}</p> : (
            <ul className="att-list">
              {g.list.map((a) => (
                <li key={a.userId}>
                  <Avatar profile={{ name: a.name, community: a.community, photoUrl: a.photoUrl }} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{a.name}</b>{a.isMe && <span className="pill pill-rose" style={{ marginLeft: 6 }}>{t('event.you')}</span>}
                    {isAdmin && <div className="muted small">{a.email}{a.markedBy ? ` · ${a.markedBy === 'self' ? 'self check-in' : 'marked by admin'}` : ''}</div>}
                  </div>
                  {isAdmin && (
                    <select value={a.attendance} onChange={(e) => onMark(a.userId, e.target.value)} aria-label={`Attendance for ${a.name}`} style={{ width: 'auto' }}>
                      <option value="pending">Not marked</option>
                      <option value="attended">Came</option>
                      <option value="no_show">Didn’t come</option>
                    </select>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </section>
  );
}

// ---------- Photos ----------
function Photos({ data, isAdmin, eventId, reload }) {
  const { t } = useT();
  const fileRef = useRef(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  const upload = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setBusy(true); setError('');
    try {
      const small = await compressImage(file);
      const fd = new FormData();
      fd.append('photo', small);
      if (caption) fd.append('caption', caption);
      await apiUpload(`/events/${eventId}/photos`, fd);
      setCaption('');
      setPreview(null);
      fileRef.current.value = '';
      await reload();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const act = async (fn) => {
    setError('');
    try { await fn(); await reload(); } catch (err) { setError(errorText(err)); }
  };

  return (
    <section className="card">
      <h3>{t('event.photos')} ({data.photos.length})</h3>
      {error && <div className="error">{error}</div>}
      {data.permissions.canUpload ? (
        <form className="photo-upload" onSubmit={upload}>
          <label className="btn btn-ghost">
            <Icon name="camera" size={18} /> {t('event.addPhoto')}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; setPreview(f ? URL.createObjectURL(f) : null); }} />
          </label>
          {preview && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="photo-preview" />
              <input placeholder={t('event.caption')} value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={200} style={{ flex: 1, minWidth: 160 }} />
              <button className="btn" disabled={busy}>{busy ? t('event.uploading') : t('event.upload')}</button>
            </>
          )}
        </form>
      ) : (
        <p className="muted small">{t('event.photoRsvp')}</p>
      )}
      {data.photos.length === 0 ? <p className="muted">{t('event.noPhotos')}</p> : (
        <div className="photo-grid">
          {data.photos.map((p) => (
            <figure key={p.id} className="photo">
              <a href={p.url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.caption || 'Event photo'} loading="lazy" />
              </a>
              {p.isCover && <span className="photo-cover">{t('event.cover')}</span>}
              <figcaption>
                {p.caption && <div>{p.caption}</div>}
                <div className="muted small">{p.uploader}</div>
                <div className="row" style={{ gap: '0.5rem' }}>
                  {isAdmin && !p.isCover && <button type="button" className="linklike small" onClick={() => act(() => api(`/events/${eventId}/photos/${p.id}/cover`, { method: 'POST' }))}>{t('event.makeCover')}</button>}
                  {p.canDelete && <button type="button" className="linklike small danger-link" onClick={() => window.confirm(t('event.confirmDelete')) && act(() => api(`/events/${eventId}/photos/${p.id}`, { method: 'DELETE' }))}>{t('event.delete')}</button>}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}

// ---------- Comments & feedback ----------
function Comments({ data, eventId, reload }) {
  const { t, lang } = useT();
  const [kind, setKind] = useState('general');
  const [text, setText] = useState('');
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const ended = ['ended', 'completed', 'live'].includes(data.event.phase);

  useEffect(() => { if (ended) setKind('liked'); }, [ended]);

  const post = async (e) => {
    e.preventDefault();
    if (!text.trim()) return setError(t('chat.writeFirst'));
    setBusy(true); setError('');
    try {
      await api(`/events/${eventId}/comments`, { method: 'POST', body: { text, kind } });
      setText('');
      await reload();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const del = async (id) => {
    if (!window.confirm(t('event.confirmDelete'))) return;
    try { await api(`/events/${eventId}/comments/${id}`, { method: 'DELETE' }); await reload(); } catch (err) { setError(errorText(err)); }
  };

  const shown = data.comments.filter((c) => filter === 'all' || c.kind === filter);
  const count = (k) => data.comments.filter((c) => c.kind === k).length;

  return (
    <section className="card">
      <h3 style={{ marginBottom: 0 }}>{t('event.feedback')} ({data.comments.length})</h3>
      <p className="muted small" style={{ marginTop: 0 }}>{t('event.feedbackLead')}</p>
      <form onSubmit={post} className="comment-form">
        <div className="seg" role="group" aria-label="Type">
          {['general', 'liked', 'improve'].map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>{t(`kind.${k}`)}</button>
          ))}
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t('event.commentPlaceholder')} maxLength={1000} />
        {error && <div className="error">{error}</div>}
        <button className="btn" disabled={busy}>{t('event.post')}</button>
      </form>

      <div className="row" style={{ margin: '1rem 0 0.5rem', gap: '0.4rem' }}>
        {['all', 'liked', 'improve', 'general'].map((k) => (
          <button key={k} type="button" className="tag tag-select" aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {k === 'all' ? t('event.filterAll') : t(`kind.${k}`)} ({k === 'all' ? data.comments.length : count(k)})
          </button>
        ))}
      </div>
      {shown.length === 0 ? <p className="muted">{t('event.noComments')}</p> : (
        <ul className="comment-list">
          {shown.map((c) => (
            <li key={c.id} className={`comment comment-${c.kind}`}>
              <Avatar profile={{ name: c.author.name, community: c.author.community, photoUrl: c.author.photoUrl }} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row" style={{ gap: '0.4rem' }}>
                  <b>{c.author.name}</b>
                  {c.author.isAdmin && <span className="pill">{t('event.admin')}</span>}
                  {c.kind !== 'general' && <span className={`pill ${c.kind === 'liked' ? 'pill-ok' : 'pill-warn'}`}>{t(`kind.${c.kind}`)}</span>}
                  <span className="muted small">{timeAgoT(c.createdAt, lang)}</span>
                </div>
                <p style={{ margin: '0.2rem 0 0', whiteSpace: 'pre-wrap' }}>{c.text}</p>
              </div>
              {c.canDelete && <button type="button" className="linklike small danger-link" onClick={() => del(c.id)}>{t('event.delete')}</button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------- Admin: activity log ----------
function ActivityLog({ eventId, version }) {
  const { t, lang } = useT();
  const [rows, setRows] = useState(null);
  useEffect(() => { api(`/events/${eventId}/activity`).then(setRows).catch(() => setRows([])); }, [eventId, version]);
  return (
    <section className="card">
      <h3>{t('event.activity')}</h3>
      {!rows ? <p className="muted">…</p> : rows.length === 0 ? <p className="muted">—</p> : (
        <ul className="history">
          {rows.map((r) => (
            <li key={r.id}>
              <b>{r.actorName}</b>{r.actorRole === 'admin' && <span className="pill" style={{ marginLeft: 6 }}>admin</span>} <span>{r.detail}</span>
              <div className="muted small">{timeAgoT(r.createdAt, lang)} · {new Date(r.createdAt).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------- Page ----------
function EventDetail({ id }) {
  const { user } = useAuth();
  const { t, lang } = useT();
  const isAdmin = user.role === 'admin';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [version, setVersion] = useState(0);

  const load = useCallback(async () => {
    try {
      setData(await api(`/events/${id}`));
      setVersion((v) => v + 1);
    } catch (e) {
      setError(errorText(e));
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const act = async (fn) => {
    setBusy(true); setError('');
    try { await fn(); await load(); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };

  if (error && !data) return <div className="error">{error} <Link href={isAdmin ? '/admin/events' : '/events'}>{t('events.back')}</Link></div>;
  if (!data) return <p className="muted center">…</p>;

  const e = data.event;
  const c = e.counts;
  const canRsvp = !isAdmin && ['upcoming', 'live'].includes(e.phase);
  const spotsLeft = e.capacity ? Math.max(0, e.capacity - c.going) : null;

  return (
    <div className="stack">
      <Link href={isAdmin ? '/admin/events' : '/events'} className="small">← {t('events.back')}</Link>

      <section className="event-hero" style={e.coverUrl ? { backgroundImage: `linear-gradient(180deg, rgba(43,24,32,0.1), rgba(43,24,32,0.75)), url(${e.coverUrl})` } : undefined}>
        <div className="row" style={{ gap: '0.5rem' }}>
          <PhaseBadge phase={e.phase} />
          {e.featured && <span className="phase phase-featured">{t('events.featured')}</span>}
          <CommunityBadge community={e.community} />
          <div className="spacer" />
          {isAdmin && (
            <button type="button" className="btn btn-ghost hero-btn" onClick={() => setEditing((v) => !v)}>
              <Icon name="edit" size={18} /> {t('event.edit')}
            </button>
          )}
        </div>
        <h1>{e.title}</h1>
        <div className="event-hero-meta">
          <span>{fmtEventDate(e.date, lang)}</span>
          {(e.venue || e.city) && <span><Icon name="pin" size={16} /> {[e.venue, e.city].filter(Boolean).join(', ')}</span>}
          {e.capacity && <span>{spotsLeft === 0 ? t('events.full') : t('events.spotsLeft', { n: spotsLeft, total: e.capacity })}</span>}
        </div>
      </section>

      {e.phase === 'cancelled' && <div className="error">{t('event.cancelledBanner')}</div>}
      {error && <div className="error" role="alert">{error}</div>}
      {editing && <EditEvent event={e} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />}

      <div className="event-layout">
        <div className="stack">
          {e.description && <section className="card"><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{e.description}</p>{e.sponsor && <p className="muted small" style={{ margin: '0.75rem 0 0' }}>{t('events.sponsored', { name: e.sponsor })}</p>}</section>}

          {!isAdmin && (
            <section className="card stack">
              {canRsvp && (
                <div>
                  <div className="section-label">{t('event.yourRsvp')}</div>
                  <div className="row">
                    {['going', 'interested', 'not_going'].map((r) => (
                      <button key={r} type="button" className={`btn ${c.myRsvp === r ? '' : 'btn-ghost'}`} disabled={busy || (r === 'going' && spotsLeft === 0 && c.myRsvp !== 'going')}
                        onClick={() => act(() => api(`/events/${id}/rsvp`, { method: 'POST', body: { rsvp: r } }))}>
                        {c.myRsvp === r && <Icon name="check" size={16} />} {t(`rsvp.${r}`)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {c.myAttendance === 'attended' ? (
                <div className="notice"><Icon name="check" size={16} /> {t('event.checkedIn')}</div>
              ) : data.permissions.canCheckIn ? (
                <button type="button" className="btn btn-lg checkin-btn" disabled={busy} onClick={() => act(() => api(`/events/${id}/checkin`, { method: 'POST' }))}>
                  {t('event.checkin')}
                </button>
              ) : e.phase === 'upcoming' ? (
                <p className="muted small" style={{ margin: 0 }}>{t('event.checkinHint')}</p>
              ) : null}
            </section>
          )}

          <section className="card">
            <div className="row">
              <button type="button" className={`react-btn ${c.myReaction === 'like' ? 'on like' : ''}`} disabled={busy} aria-pressed={c.myReaction === 'like'}
                onClick={() => act(() => api(`/events/${id}/reaction`, { method: 'POST', body: { value: c.myReaction === 'like' ? 'none' : 'like' } }))}>
                <Icon name="thumbUp" /> {t('event.like')} <b>{c.likes}</b>
              </button>
              <button type="button" className={`react-btn ${c.myReaction === 'dislike' ? 'on dislike' : ''}`} disabled={busy} aria-pressed={c.myReaction === 'dislike'}
                onClick={() => act(() => api(`/events/${id}/reaction`, { method: 'POST', body: { value: c.myReaction === 'dislike' ? 'none' : 'dislike' } }))}>
                <Icon name="thumbDown" /> {t('event.dislike')} <b>{c.dislikes}</b>
              </button>
            </div>
          </section>

          <Photos data={data} isAdmin={isAdmin} eventId={id} reload={load} />
          <Comments data={data} eventId={id} reload={load} />
        </div>

        <div className="stack">
          <section className="card">
            <div className="section-label">{t('event.when')}</div>
            <p style={{ margin: '0 0 0.75rem' }}>{fmtEventDate(e.date, lang)} – {new Date(e.endDate).toLocaleTimeString(lang === 'hi' ? 'hi-IN' : 'en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
            <div className="section-label">{t('event.where')}</div>
            <p style={{ margin: '0 0 0.75rem' }}>{[e.venue, e.city].filter(Boolean).join(', ') || '—'}</p>
            <div className="section-label">{t('event.community')}</div>
            <p className="small muted" style={{ margin: 0 }}>{t('event.communityText', { community: t(`community.${e.community}.label`) })}</p>
          </section>
          <Attendance data={data} isAdmin={isAdmin} onMark={(userId, attendance) => act(() => api(`/events/${id}/attendance`, { method: 'POST', body: { userId, attendance } }))} />
          {isAdmin && <ActivityLog eventId={id} version={version} />}
        </div>
      </div>
    </div>
  );
}

export default function EventPage({ params }) {
  const { id } = use(params);
  return <Protected allowAdmin><EventDetail id={id} /></Protected>;
}
