'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Protected from '@/components/Protected';
import TagSelector from '@/components/TagSelector';
import ProfileCard from '@/components/ProfileCard';
import { useAuth } from '@/context/AuthContext';
import { api, errorText } from '@/lib/api';

const EMPTY = {
  name: '', age: '', city: '', bio: '', photoUrl: '',
  values: [], boundaries: [], sensoryPrefs: [], identityTags: [],
  commStyle: { prefersText: true, replyPace: 'same day', directness: 'medium' },
  lookingFor: 'dating',
};

function ProfileBuilder() {
  const { user, setUser, options } = useAuth();
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

  if (!options) return <p className="muted center">Loading…</p>;
  const c = options.communities[user.community];
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const setCs = (k, v) => setForm((f) => ({ ...f, commStyle: { ...f.commStyle, [k]: v } }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaved('');
    if (!form.name || !form.age || !form.city) return setError('Name, age and city are required');
    if (Number(form.age) < 18) return setError('You must be 18 or older');
    if (!form.values.length) return setError('Pick at least one value');
    setBusy(true);
    try {
      const body = { ...form, age: Number(form.age), visibility: { identityTags: visibility } };
      if (!body.photoUrl) delete body.photoUrl;
      const data = await api('/profile/me', { method: 'PUT', body });
      setUser(data.user);
      if (onboarding) router.push('/discover');
      else setSaved('Profile saved');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
      <form className="card" onSubmit={onSubmit} noValidate>
        <h1>{onboarding ? 'Build your profile' : 'Edit profile'}</h1>
        <p className="muted">{c.label} community — {c.tagline}</p>
        {error && <div className="error" role="alert">{error}</div>}
        {saved && <div className="notice" role="status" style={{ marginBottom: '1rem' }}>{saved}</div>}

        <div className="row">
          <label className="field" style={{ flex: 2 }}><span>First name</span>
            <input value={form.name} onChange={(e) => set('name')(e.target.value)} maxLength={50} />
          </label>
          <label className="field" style={{ flex: 1 }}><span>Age</span>
            <input type="number" min={18} max={100} value={form.age} onChange={(e) => set('age')(e.target.value)} />
          </label>
        </div>
        <label className="field"><span>City</span>
          <input value={form.city} onChange={(e) => set('city')(e.target.value)} maxLength={60} />
        </label>
        <label className="field"><span>About you</span>
          <textarea value={form.bio} onChange={(e) => set('bio')(e.target.value)} maxLength={500} />
          <div className="hint">{form.bio.length}/500</div>
        </label>
        <label className="field"><span>Looking for</span>
          <select value={form.lookingFor} onChange={(e) => set('lookingFor')(e.target.value)}>
            <option value="friendship">Friendship</option>
            <option value="dating">Dating</option>
            <option value="long-term">Long-term</option>
          </select>
        </label>

        <TagSelector label="Your values" hint="What you share with a partner." options={c.values} value={form.values} onChange={set('values')} max={8} />
        <TagSelector label="Your boundaries" hint="Non-negotiables — say them once, never explain again." options={c.boundaries} value={form.boundaries} onChange={set('boundaries')} max={6} />
        <TagSelector label="Sensory preferences" options={options.sensoryPrefs} value={form.sensoryPrefs} onChange={set('sensoryPrefs')} max={7} />

        <fieldset style={{ border: 'none', padding: 0, margin: '0 0 1.25rem' }}>
          <legend style={{ fontWeight: 600, marginBottom: '0.5rem' }}>How you communicate</legend>
          <label className="row" style={{ marginBottom: '0.75rem' }}>
            <input type="checkbox" style={{ width: 20, height: 20 }} checked={form.commStyle.prefersText} onChange={(e) => setCs('prefersText', e.target.checked)} />
            I prefer text over calls
          </label>
          <div className="row">
            <label className="field" style={{ flex: 1 }}><span>Reply pace</span>
              <select value={form.commStyle.replyPace} onChange={(e) => setCs('replyPace', e.target.value)}>
                {options.replyPace.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="field" style={{ flex: 1 }}><span>Directness</span>
              <select value={form.commStyle.directness} onChange={(e) => setCs('directness', e.target.value)}>
                {options.directness.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
          </div>
        </fieldset>

        <TagSelector label="Identity (optional)" hint="Sensitive — you control who sees this." options={c.identityTags} value={form.identityTags} onChange={set('identityTags')} max={3} />
        <label className="field"><span>Who can see your identity tags?</span>
          <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            <option value="matches">Only my matches</option>
            <option value="everyone">Everyone in my community</option>
            <option value="nobody">Nobody</option>
          </select>
        </label>

        <label className="field"><span>Photo URL (optional)</span>
          <input type="url" value={form.photoUrl || ''} onChange={(e) => set('photoUrl')(e.target.value)} placeholder="https://…" />
        </label>

        <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? 'Saving…' : onboarding ? 'Save and start discovering' : 'Save profile'}</button>
      </form>

      <div className="stack">
        <h3 style={{ margin: 0 }}>Preview — how others see you</h3>
        <ProfileCard profile={{ ...form, community: user.community, age: form.age || '?', name: form.name || 'Your name' }} />
        <div className="card small">
          <strong>Plan:</strong> {user.plan === 'premium' ? 'Premium' : 'Free'}{' '}
          {user.plan !== 'premium' && (
            <button type="button" className="btn btn-accent" style={{ marginLeft: '0.5rem' }} onClick={async () => setUser((await api('/profile/me/upgrade', { method: 'POST' })).user)}>
              Upgrade (demo)
            </button>
          )}
          <p className="muted" style={{ marginTop: '0.5rem', marginBottom: 0 }}>Premium: unlimited likes and see who liked you.</p>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Protected needsProfile={false}>
      <Suspense fallback={<p className="muted center">Loading…</p>}>
        <ProfileBuilder />
      </Suspense>
    </Protected>
  );
}
