// Controls exactly what other users can see. Never send email, passwordHash,
// blocked list or plan to anyone except the account owner.

function canSeeIdentityTags(owner, { isMatch = false } = {}) {
  const v = owner.visibility?.identityTags || 'matches';
  return v === 'everyone' || (v === 'matches' && isMatch);
}

function publicProfile(user, opts = {}) {
  const p = user.profile || {};
  return {
    id: String(user._id),
    community: user.community,
    name: p.name,
    age: p.age,
    city: p.city,
    bio: p.bio,
    photoUrl: p.photoUrl,
    values: p.values || [],
    boundaries: p.boundaries || [],
    sensoryPrefs: p.sensoryPrefs || [],
    commStyle: p.commStyle,
    lookingFor: p.lookingFor,
    identityTags: canSeeIdentityTags(user, opts) ? p.identityTags || [] : [],
    identityTagsHidden: !canSeeIdentityTags(user, opts) && (p.identityTags || []).length > 0,
  };
}

function privateUser(user) {
  return {
    id: String(user._id),
    email: user.email,
    community: user.community,
    plan: user.plan,
    profileComplete: user.profileComplete,
    visibility: user.visibility,
    profile: user.profile,
  };
}

module.exports = { publicProfile, privateUser, canSeeIdentityTags };
