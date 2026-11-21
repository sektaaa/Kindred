'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Protected from '@/components/Protected';
import Avatar from '@/components/Avatar';
import ChatBubble from '@/components/ChatBubble';
import ComfortCard from '@/components/ComfortCard';
import BoundaryBadge from '@/components/BoundaryBadge';
import { api, errorText } from '@/lib/api';
import { useT } from '@/context/LanguageContext';

const POLL_MS = 3000;

function Chat({ matchId }) {
  const { t } = useT();
  const router = useRouter();
  const [match, setMatch] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const lastRef = useRef(null);

  const fetchMessages = useCallback(async (initial = false) => {
    const after = !initial && lastRef.current ? `?after=${encodeURIComponent(lastRef.current)}` : '';
    const data = await api(`/matches/${matchId}/messages${after}`);
    if (initial) {
      setMatch(data.match);
      setMessages(data.messages);
    } else if (data.messages.length) {
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        return [...prev, ...data.messages.filter((m) => !ids.has(m.id))];
      });
    }
    const all = data.messages;
    if (all.length) lastRef.current = all[all.length - 1].createdAt;
  }, [matchId]);

  useEffect(() => {
    fetchMessages(true).catch((e) => setError(errorText(e)));
    // Polling keeps the MVP simple; swap for Socket.io later.
    const t = setInterval(() => fetchMessages().catch(() => {}), POLL_MS);
    return () => clearInterval(t);
  }, [fetchMessages]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages.length]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return setError(t('chat.writeFirst'));
    setSending(true);
    setError('');
    try {
      const msg = await api(`/matches/${matchId}/messages`, { method: 'POST', body: { text } });
      setMessages((prev) => [...prev, msg]);
      lastRef.current = msg.createdAt;
      setText('');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSending(false);
    }
  };

  const unmatch = async () => {
    if (!window.confirm(t('chat.confirmUnmatch'))) return;
    await api(`/matches/${matchId}`, { method: 'DELETE' });
    router.push('/matches');
  };

  const block = async () => {
    if (!window.confirm(t('chat.confirmBlock', { name: match.profile.name }))) return;
    await api(`/profile/${match.profile.id}/block`, { method: 'POST' });
    router.push('/matches');
  };

  if (error && !match) return <div className="error narrow">{error} <Link href="/matches">{t('chat.all')}</Link></div>;
  if (!match) return <p className="muted center">…</p>;
  const p = match.profile;

  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'start' }}>
      <section className="card stack" aria-label="Conversation">
        <div className="row">
          <Avatar profile={p} size={48} />
          <div><strong>{p.name}</strong><div className="muted small">{t('matches.compatible', { n: match.compatibility })}</div></div>
          <div className="spacer" />
          <Link href="/matches" className="small">{t('chat.all')}</Link>
        </div>
        <div className="chat" aria-live="polite">
          {messages.length === 0 && <p className="muted center small">{t('chat.empty')}</p>}
          {messages.map((m) => <ChatBubble key={m.id} message={m} />)}
          <div ref={endRef} />
        </div>
        {error && <div className="error" role="alert">{error}</div>}
        <form onSubmit={send} className="row">
          <label htmlFor="msg" className="sr-only" style={{ position: 'absolute', left: -9999 }}>{t('chat.placeholder')}</label>
          <input id="msg" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('chat.placeholder')} maxLength={2000} style={{ flex: 1 }} />
          <button className="btn" disabled={sending}>{t('chat.send')}</button>
        </form>
      </section>

      <aside className="stack">
        <ComfortCard profile={p} title={t('comfort.titleFor', { name: p.name })} />
        {p.boundaries?.length > 0 && (
          <div className="card">
            <div className="section-label">{t('chat.boundaries')}</div>
            <BoundaryBadge items={p.boundaries} kind="boundary" />
          </div>
        )}
        {p.identityTags?.length > 0 && (
          <div className="card">
            <div className="section-label">{t('chat.shared')}</div>
            <BoundaryBadge items={p.identityTags} kind="identity" />
          </div>
        )}
        <div className="row">
          <button className="btn btn-ghost" onClick={unmatch}>{t('chat.unmatch')}</button>
          <button className="btn btn-ghost" onClick={block}>{t('chat.block')}</button>
        </div>
      </aside>
    </div>
  );
}

export default function ChatPage({ params }) {
  const { id } = use(params);
  return <Protected><Chat matchId={id} /></Protected>;
}
