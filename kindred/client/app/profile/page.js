'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Protected from '@/components/Protected';
import TagSelector from '@/components/TagSelector';
import ProfileCard from '@/components/ProfileCard';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/context/LanguageContext';
import { api, errorText } from '@/lib/api';

const EMPTY = {
  name: '', age: '', city: '', bio: '', photoUrl: '',
  values: [], interests: [], boundaries: [], sensoryPrefs: [], identityTags: [],
  commStyle: { prefersText: true, replyPace: 'same day', directness: 'medium' },
  lookingFor: 'dating',
};

function ProfileBuilder() {
  const { user, setUser, options } = useAuth();
  const { t, tag } = useT();
  const router = useRouter();
  const onboarding = useSearchParams().get('onboarding') === '1';
  const [form, setForm] = useState(EMPTY);
  const [visibility, setVisibility] = useState('matches');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user?.profile) setForm({ ...EMPTY, ...user.profile, commStyle: { ...EMPTY.commStyle, ...user.profile.commStyle } });
    if (user?.visibility?.identityTags) setVisibility(user.visibility.identityTags);
  }, [user]);

  if (!options) return <p className="muted center">…</p>;
  const c = options.communities[user.community];
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const setCs = (k, v) => setForm((f) => ({ ...f, commStyle: { ...f.commStyle, [k]: v } }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaved('');
    if (!form.name || !form.age || !form.city) return setError(t('profile.errRequired'));
    if (Number(form.age) < 18) return setError(t('profile.err18'));
    if (!form.values.length) return setError(t('profile.errValue'));
    setBusy(true);
    try {
      const body = { ...form, age: Number(form.age), visibility: { identityTags: visibility } };
      if (!body.photoUrl) delete body.photoUrl;
      const data = await api('/profile/me', { method: 'PUT', body });
      setUser(data.user);
      if (onboarding) router.push('/discover');
      else setSaved(t('profile.saved'));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
      <form className="card" onSubmit={onSubmit} noValidate>
        <h1>{onboarding ? t('profile.build') : t('profile.edit')}</h1>
        <p className="muted">{t(`community.${user.community}.label`)} {t('profile.community')} — {t(`community.${user.community}.tagline`)}</p>
        {error && <div className="error" role="alert">{error}</div>}
        {saved && <div className="notice" role="status" style={{ marginBottom: '1rem' }}>{saved}</div>}

        <div className="row">
          <label className="field" style={{ flex: 2 }}><span>{t('profile.name')}</span>
            <input value={form.name} onChange={(e) => set('name')(e.target.value)} maxLength={50} />
          </label>
          <label className="field" style={{ flex: 1 }}><span>{t('profile.age')}</span>
            <input type="number" min={18} max={100} value={form.age} onChange={(e) => set('age')(e.target.value)} />
          </label>
        </div>
        <label className="field"><span>{t('profile.city')}</span>
          <input value={form.city} onChange={(e) => set('city')(e.target.value)} maxLength={60} />
        </label>
        <label className="field"><span>{t('profile.bio')}</span>
          <textarea value={form.bio} onChange={(e) => set('bio')(e.target.value)} maxLength={500} />
          <div className="hint">{form.bio.length}/500</div>
        </label>
        <label className="field"><span>{t('profile.lookingFor')}</span>
          <select value={form.lookingFor} onChange={(e) => set('lookingFor')(e.target.value)}>
            {['friendship', 'dating', 'long-term'].map((v) => <option key={v} value={v}>{tag(v)}</option>)}
          </select>
        </label>

        <TagSelector label={t('profile.interests')} hint={t('profile.interestsHint')} options={options.interests || []} value={form.interests} onChange={set('interests')} max={10} />
        <TagSelector label={t('profile.values')} hint={t('profile.valuesHint')} options={c.values} value={form.values} onChange={set('values')} max={8} />
        <TagSelector label={t('profile.boundaries')} hint={t('profile.boundariesHint')} options={c.boundaries} value={form.boundaries} onChange={set('boundaries')} max={6} />
        <TagSelector label={t('profile.sensory')} options={options.sensoryPrefs} value={form.sensoryPrefs} onChange={set('sensoryPrefs')} max={7} />

        <fieldset style={{ border: 'none', padding: 0, margin: '0 0 1.25rem' }}>
          <legend style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{t('profile.comm')}</legend>
          <label className="row" style={{ marginBottom: '0.75rem' }}>
            <input type="checkbox" style={{ width: 20, height: 20 }} checked={form.commStyle.prefersText} onChange={(e) => setCs('prefersText', e.target.checked)} />
            {t('profile.prefersText')}
          </label>
          <div className="row">
            <label className="field" style={{ flex: 1 }}><span>{t('profile.replyPace')}</span>
              <select value={form.commStyle.replyPace} onChange={(e) => setCs('replyPace', e.target.value)}>
                {options.replyPace.map((p) => <option key={p} value={p}>{tag(p)}</option>)}
              </select>
            </label>
            <label className="field" style={{ flex: 1 }}><span>{t('profile.directness')}</span>
              <select value={form.commStyle.directness} onChange={(e) => setCs('directness', e.target.value)}>
                {options.directness.map((p) => <option key={p} value={p}>{tag(p)}</option>)}
              </select>
            </label>
          </div>
        </fieldset>

        <TagSelector label={t('profile.identity')} hint={t('profile.identityHint')} options={c.identityTags} value={form.identityTags} onChange={set('identityTags')} max={3} />
        <label className="field"><span>{t('profile.whoSees')}</span>
          <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            <option value="matches">{t('profile.vis.matches')}</option>
            <option value="everyone">{t('profile.vis.everyone')}</option>
            <option value="nobody">{t('profile.vis.nobody')}</option>
          </select>
        </label>

        <label className="field"><span>{t('profile.photo')}</span>
          <input type="url" value={form.photoUrl || ''} onChange={(e) => set('photoUrl')(e.target.value)} placeholder="https://…" />
        </label>

        <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? t('profile.saving') : onboarding ? t('profile.saveStart') : t('profile.save')}</button>
      </form>

      <div className="stack">
        <h3 style={{ margin: 0 }}>{t('profile.preview')}</h3>
        <ProfileCard profile={{ ...form, community: user.community, age: form.age || '?', name: form.name || t('profile.yourName') }} />
        <div className="card small">
          <strong>{t('profile.plan')}:</strong> {user.plan === 'premium' ? t('profile.premium') : t('profile.free')}{' '}
          {user.plan !== 'premium' && (
            <button type="button" className="btn btn-accent" style={{ marginLeft: '0.5rem' }} onClick={async () => setUser((await api('/profile/me/upgrade', { method: 'POST' })).user)}>
              {t('profile.upgrade')}
            </button>
          )}
          <p className="muted" style={{ marginTop: '0.5rem', marginBottom: 0 }}>{t('profile.premiumText')}</p>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Protected needsProfile={false}>
      <Suspense fallback={<p className="muted center">…</p>}>
        <ProfileBuilder />
      </Suspense>
    </Protected>
  );
}
