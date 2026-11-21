'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/context/LanguageContext';
import { errorText } from '@/lib/api';
import Heart from '@/components/Heart';

const DEMOS = ['sober', 'eco', 'neurodiverse'];

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useT();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const doLogin = async (email, password) => {
    setError('');
    setBusy(true);
    try {
      const user = await login(email, password);
      if (user.role === 'admin') router.push('/admin');
      else router.push(user.profileComplete ? '/discover' : '/profile?onboarding=1');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="narrow card auth-card fade-up">
      <div style={{ color: 'var(--primary)' }}><Heart size={40} className="logo-heart" /></div>
      <h1>{t('auth.welcome')} <span className="grad-text">{t('auth.back')}</span></h1>
      <p className="muted">{t('auth.waiting')}</p>
      {error && <div className="error" role="alert">{error}</div>}
      <form onSubmit={(e) => { e.preventDefault(); doLogin(form.email, form.password); }}>
        <label className="field">
          <span>{t('auth.email')}</span>
          <input type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className="field">
          <span>{t('auth.password')}</span>
          <input type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? t('auth.loggingIn') : t('auth.login')}</button>
      </form>

      <div className="notice small" style={{ marginTop: '1.25rem' }}>
        <strong>{t('auth.demo')}</strong> ({t('auth.demoPassword')} <code>Demo1234</code>):
        <div className="row" style={{ marginTop: '0.5rem' }}>
          {DEMOS.map((d) => (
            <button key={d} type="button" className="btn btn-ghost" disabled={busy} onClick={() => doLogin(`demo.${d}@kindred.app`, 'Demo1234')}>
              {t(`community.${d}`)}
            </button>
          ))}
          {/* Only in local development, so the default admin login is never advertised on a live site. */}
          {process.env.NODE_ENV !== 'production' && (
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => doLogin('admin@kindred.app', 'Admin@12345')}>
              admin
            </button>
          )}
        </div>
      </div>

      <p className="small muted center" style={{ marginTop: '1rem' }}>
        {t('auth.newHere')} <Link href="/signup">{t('auth.create')}</Link>
      </p>
    </div>
  );
}
