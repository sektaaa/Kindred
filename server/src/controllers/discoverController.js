const Like = require('../models/Like');
const Match = require('../models/Match');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { getDiscoverFeed, scorePair } = require('../services/matchingService');
const { publicProfile } = require('../services/serialize');

const FREE_DAILY_LIKES = 15;

// GET /api/discover
exports.discover = async (req, res) => {
  const feed = await getDiscoverFeed(req.user);
  res.json({
    success: true,
    data: feed.map(({ user, compatibility, reasons }) => ({
      profile: publicProfile(user),
      compatibility,
      reasons,
    })),
  });
};

// POST /api/swipes  { toUser, action: 'like' | 'pass' }
exports.swipe = async (req, res) => {
  const { toUser, action } = req.body;
  const me = req.user;
  if (String(me._id) === toUser) throw new AppError('You cannot swipe on yourself', 400);

  const target = await User.findById(toUser);
  if (!target || target.role === 'admin' || target.status === 'suspended' || target.community !== me.community || !target.profileComplete) {
    throw new AppError('Profile not found', 404);
  }
  if (target.blocked.some((id) => id.equals(me._id))) throw new AppError('Profile not found', 404);

  if (action === 'like' && me.plan === 'free') {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const today = await Like.countDocuments({ fromUser: me._id, action: 'like', createdAt: { $gte: since } });
    if (today >= FREE_DAILY_LIKES) {
      throw new AppError(`Free plan allows ${FREE_DAILY_LIKES} likes a day. Upgrade for unlimited.`, 402);
    }
  }

  await Like.create({ fromUser: me._id, toUser, action });

  let match = null;
  if (action === 'like') {
    const reciprocal = await Like.exists({ fromUser: toUser, toUser: me._id, action: 'like' });
    if (reciprocal) {
      const pairKey = Match.pairKeyFor(me._id, toUser);
      match = await Match.findOneAndUpdate(
        { pairKey },
        { $setOnInsert: { pairKey, users: [me._id, target._id].sort(), compatibility: scorePair(me, target) } },
        { upsert: true, new: true }
      );
    }
  }

  res.status(201).json({
    success: true,
    data: {
      matched: Boolean(match),
      matchId: match ? String(match._id) : null,
      profile: match ? publicProfile(target, { isMatch: true }) : undefined,
    },
  });
};

// GET /api/likes/received — premium feature: see who already liked you.
exports.likesReceived = async (req, res) => {
  const me = req.user;
  const myLikes = await Like.find({ fromUser: me._id }).distinct('toUser');
  const incoming = await Like.find({
    toUser: me._id,
    action: 'like',
    fromUser: { $nin: [...myLikes, ...me.blocked] },
  }).populate('fromUser');

  const valid = incoming.filter((l) => l.fromUser);
  if (me.plan !== 'premium') {
    return res.json({ success: true, data: { locked: true, count: valid.length, profiles: [] } });
  }
  res.json({ success: true, data: { locked: false, count: valid.length, profiles: valid.map((l) => publicProfile(l.fromUser)) } });
};
