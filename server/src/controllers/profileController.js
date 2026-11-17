const User = require('../models/User');
const Match = require('../models/Match');
const Like = require('../models/Like');
const Message = require('../models/Message');
const AppError = require('../utils/AppError');
const { profileSchemaFor } = require('../validators/schemas');
const { publicProfile, privateUser } = require('../services/serialize');
const { COMMUNITIES, SENSORY_PREFS, REPLY_PACE, DIRECTNESS } = require('../config/communities');

exports.options = (req, res) => {
  res.json({ success: true, data: { communities: COMMUNITIES, sensoryPrefs: SENSORY_PREFS, replyPace: REPLY_PACE, directness: DIRECTNESS } });
};

// PUT /api/profile/me — options are validated against the user's own community.
exports.updateMyProfile = async (req, res) => {
  const result = profileSchemaFor(req.user.community).safeParse(req.body);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    throw new AppError('Validation failed', 400, details);
  }
  const { visibility, ...profile } = result.data;

  req.user.profile = profile;
  if (visibility) req.user.visibility = visibility;
  req.user.profileComplete = Boolean(profile.name && profile.age && profile.city && profile.values.length);
  await req.user.save();

  res.json({ success: true, data: { user: privateUser(req.user) } });
};

// GET /api/profile/:id — only within your own community, never if blocked.
exports.getProfile = async (req, res) => {
  const other = await User.findById(req.params.id);
  const blocked =
    !other ||
    other.role === 'admin' ||
    other.status === 'suspended' ||
    other.community !== req.user.community ||
    other.blocked.some((id) => id.equals(req.user._id)) ||
    req.user.blocked.some((id) => id.equals(other._id));
  if (blocked) throw new AppError('Profile not found', 404);

  const isMatch = await Match.exists({ pairKey: Match.pairKeyFor(req.user._id, other._id) });
  res.json({ success: true, data: { profile: publicProfile(other, { isMatch: Boolean(isMatch) }) } });
};

// POST /api/profile/:id/block — safety: hides both users from each other and removes the chat.
exports.blockUser = async (req, res) => {
  const otherId = req.params.id;
  if (String(req.user._id) === otherId) throw new AppError('You cannot block yourself', 400);

  await User.updateOne({ _id: req.user._id }, { $addToSet: { blocked: otherId } });
  const match = await Match.findOneAndDelete({ pairKey: Match.pairKeyFor(req.user._id, otherId) });
  if (match) await Message.deleteMany({ match: match._id });
  await Like.deleteMany({ fromUser: otherId, toUser: req.user._id });

  res.json({ success: true, message: 'User blocked' });
};

// POST /api/profile/me/upgrade — demo stand-in for a payment provider webhook.
exports.upgrade = async (req, res) => {
  req.user.plan = 'premium';
  await req.user.save();
  res.json({ success: true, data: { user: privateUser(req.user) } });
};
