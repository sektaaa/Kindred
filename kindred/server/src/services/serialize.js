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
    interests: p.interests || [],
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
    role: user.role || 'user',
    status: user.status || 'active',
    community: user.community,
    plan: user.plan,
    profileComplete: user.profileComplete,
    visibility: user.visibility,
    profile: user.profile,
  };
}

// What the admin panel sees about an account. Still never the password hash
// and never message content: admins get counts, not private conversations.
function adminUser(user) {
  return {
    ...privateUser(user),
    blockedCount: (user.blocked || []).length,
    lastActiveAt: user.lastActiveAt || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

module.exports = { publicProfile, privateUser, adminUser, canSeeIdentityTags };
