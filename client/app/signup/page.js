'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { errorText } from '@/lib/api';
import Heart from '@/components/Heart';
import Icon from '@/components/Icon';

const CHOICES = [
  { key: 'sober', icon: 'sparkle', title: 'Sober & alcohol-free', text: 'Dates without the drinks' },
  { key: 'eco', icon: 'leaf', title: 'Eco & vegan', text: 'Love with a lighter footprint' },
  { key: 'neurodiverse', icon: 'chat', title: 'Neurodiverse', text: 'Date in your own style' },
];

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', community: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.community) return setError('Choose the community you want to join');
    if (form.password.length < 8 || !/\d/.test(form.password)) return setError('Password needs 8+ characters including a number');
    setBusy(true);
    try {
      await signup(form.email, form.password, form.community);
      router.push('/profile?onboarding=1');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="narrow card auth-card fade-up">
      <div style={{ color: 'var(--primary)' }}><Heart size={40} className="logo-heart" /></div>
      <h1>Join <span className="grad-text">Kindred</span></h1>
      <p className="muted">Pick your community — you&apos;ll only ever see people in the same space.</p>
      {error && <div className="error" role="alert">{error}</div>}
      <form onSubmit={onSubmit} noValidate>
        <div className="grid" style={{ marginBottom: '1rem' }}>
          {CHOICES.map((c) => (
            <button
              type="button"
              key={c.key}
              className="card choice"
              aria-pressed={form.community === c.key}
              onClick={() => setForm({ ...form, community: c.key })}
            >
              <div className="feature-icon" style={{ marginBottom: 0 }}><Icon name={c.icon} /></div>
              <div>
                <span className={`community community-${c.key}`}>{c.title}</span>
                <div className="small muted" style={{ marginTop: '0.25rem' }}>{c.text}</div>
              </div>
            </button>
          ))}
        </div>
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" autoComplete="new-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <div className="hint">At least 8 characters, with a letter and a number.</div>
        </label>
        <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
      <p className="small muted center" style={{ marginTop: '1rem' }}>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}
