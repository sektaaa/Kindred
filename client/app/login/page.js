'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { errorText } from '@/lib/api';
import Heart from '@/components/Heart';

const DEMOS = ['sober', 'eco', 'neurodiverse'];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const doLogin = async (email, password) => {
    setError('');
    setBusy(true);
    try {
      const user = await login(email, password);
      router.push(user.profileComplete ? '/discover' : '/profile?onboarding=1');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="narrow card auth-card fade-up">
      <div style={{ color: 'var(--primary)' }}><Heart size={40} className="logo-heart" /></div>
      <h1>Welcome <span className="grad-text">back</span></h1>
      <p className="muted">Someone special might be waiting.</p>
      {error && <div className="error" role="alert">{error}</div>}
      <form onSubmit={(e) => { e.preventDefault(); doLogin(form.email, form.password); }}>
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>

      <div className="notice small" style={{ marginTop: '1.25rem' }}>
        <strong>Demo accounts</strong> (password <code>Demo1234</code>):
        <div className="row" style={{ marginTop: '0.5rem' }}>
          {DEMOS.map((d) => (
            <button key={d} type="button" className="btn btn-ghost" disabled={busy} onClick={() => doLogin(`demo.${d}@kindred.app`, 'Demo1234')}>
              {d}
            </button>
          ))}
        </div>
      </div>

      <p className="small muted center" style={{ marginTop: '1rem' }}>
        New here? <Link href="/signup">Create an account</Link>
      </p>
    </div>
  );
}
