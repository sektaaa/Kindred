'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/context/LanguageContext';
import { errorText } from '@/lib/api';
import Heart from '@/components/Heart';
import Icon from '@/components/Icon';

const CHOICES = [
  { key: 'sober', icon: 'sparkle' },
  { key: 'eco', icon: 'leaf' },
  { key: 'neurodiverse', icon: 'chat' },
];

export default function SignupPage() {
  const { signup } = useAuth();
  const { t } = useT();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', community: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.community) return setError(t('auth.chooseCommunity'));
    if (form.password.length < 8 || !/\d/.test(form.password)) return setError(t('auth.weakPassword'));
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
      <h1>{t('auth.join')} <span className="grad-text">Kindred</span></h1>
      <p className="muted">{t('auth.pick')}</p>
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
                <span className={`community community-${c.key}`}>{t(`community.${c.key}.label`)}</span>
                <div className="small muted" style={{ marginTop: '0.25rem' }}>{t(`auth.${c.key}.text`)}</div>
              </div>
            </button>
          ))}
        </div>
        <label className="field">
          <span>{t('auth.email')}</span>
          <input type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className="field">
          <span>{t('auth.password')}</span>
          <input type="password" autoComplete="new-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <div className="hint">{t('auth.passwordHint')}</div>
        </label>
        <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? t('auth.creating') : t('auth.createBtn')}</button>
      </form>
      <p className="small muted center" style={{ marginTop: '1rem' }}>
        {t('auth.haveAccount')} <Link href="/login">{t('auth.login')}</Link>
      </p>
    </div>
  );
}
