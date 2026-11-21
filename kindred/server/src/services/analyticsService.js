const mongoose = require('mongoose');
const User = require('../models/User');
const Like = require('../models/Like');
const Match = require('../models/Match');
const Message = require('../models/Message');
const Event = require('../models/Event');

// Days are bucketed in this time zone (India by default).
const TZ = process.env.ANALYTICS_TZ || 'Asia/Kolkata';
const DAY = 24 * 60 * 60 * 1000;
const MEMBER = { role: { $ne: 'admin' } };

const pct = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);
const toMap = (rows) => Object.fromEntries(rows.map((r) => [r._id ?? 'unknown', r.count]));

async function countBy(field, match = MEMBER) {
  return toMap(await User.aggregate([{ $match: match }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }]));
}

// ---------- Platform overview ----------
async function overview() {
  const now = Date.now();
  const since = (days) => new Date(now - days * DAY);

  const [
    users, admins, complete, premium, suspended,
    new1, new7, new30, active1, active7, active30,
    byCommunity, byPlan, byLookingFor,
    likes, passes, matches, messages, upcomingEvents,
    conversations, topCities,
  ] = await Promise.all([
    User.countDocuments(MEMBER),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ ...MEMBER, profileComplete: true }),
    User.countDocuments({ ...MEMBER, plan: 'premium' }),
    User.countDocuments({ ...MEMBER, status: 'suspended' }),
    User.countDocuments({ ...MEMBER, createdAt: { $gte: since(1) } }),
    User.countDocuments({ ...MEMBER, createdAt: { $gte: since(7) } }),
    User.countDocuments({ ...MEMBER, createdAt: { $gte: since(30) } }),
    User.countDocuments({ ...MEMBER, lastActiveAt: { $gte: since(1) } }),
    User.countDocuments({ ...MEMBER, lastActiveAt: { $gte: since(7) } }),
    User.countDocuments({ ...MEMBER, lastActiveAt: { $gte: since(30) } }),
    countBy('community'),
    countBy('plan'),
    countBy('profile.lookingFor', { ...MEMBER, profileComplete: true }),
    Like.countDocuments({ action: 'like' }),
    Like.countDocuments({ action: 'pass' }),
    Match.countDocuments(),
    Message.countDocuments(),
    Event.countDocuments({ date: { $gte: new Date() } }),
    // A "conversation" = a match where both people have sent at least one message.
    Message.aggregate([
      { $group: { _id: '$match', senders: { $addToSet: '$sender' } } },
      { $match: { 'senders.1': { $exists: true } } },
      { $count: 'n' },
    ]),
    User.aggregate([
      { $match: { ...MEMBER, 'profile.city': { $nin: [null, ''] } } },
      { $group: { _id: '$profile.city', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 6 },
    ]),
  ]);

  const convCount = conversations[0]?.n || 0;
  return {
    users: {
      total: users, admins, profileComplete: complete, premium, suspended,
      newToday: new1, new7d: new7, new30d: new30,
      active1d: active1, active7d: active7, active30d: active30,
    },
    rates: {
      profileCompletion: pct(complete, users),
      premiumConversion: pct(premium, users),
      likeRate: pct(likes, likes + passes), // share of swipes that were likes
      mutualMatchRate: pct(matches * 2, likes), // likes that ended in a match
      conversationRate: pct(convCount, matches), // matches where both people replied
      avgMessagesPerMatch: matches ? Math.round((messages / matches) * 10) / 10 : 0,
    },
    engagement: { likes, passes, matches, messages, conversations: convCount, upcomingEvents },
    byCommunity,
    byPlan,
    byLookingFor,
    topCities: topCities.map((c) => ({ city: c._id, count: c.count })),
  };
}

// ---------- Daily time series ----------
async function daily(Model, match, days) {
  const start = new Date(Date.now() - (days - 1) * DAY);
  const rows = await Model.aggregate([
    { $match: { ...match, createdAt: { $gte: start } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } }, count: { $sum: 1 } } },
  ]);
  return toMap(rows);
}

function dayKeys(days) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  return Array.from({ length: days }, (_, i) => fmt.format(new Date(Date.now() - (days - 1 - i) * DAY)));
}

async function timeseries(days = 30) {
  const [signups, likes, matches, messages] = await Promise.all([
    daily(User, MEMBER, days),
    daily(Like, { action: 'like' }, days),
    daily(Match, {}, days),
    daily(Message, {}, days),
  ]);
  return dayKeys(days).map((date) => ({
    date,
    signups: signups[date] || 0,
    likes: likes[date] || 0,
    matches: matches[date] || 0,
    messages: messages[date] || 0,
  }));
}

// ---------- One user ----------
function profileCompleteness(p = {}) {
  const checks = [p.name, p.age, p.city, p.bio, p.photoUrl, p.values?.length, p.boundaries?.length, p.sensoryPrefs?.length, p.identityTags?.length, p.interests?.length, p.lookingFor];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

async function userStats(user) {
  const id = user._id;
  const oid = new mongoose.Types.ObjectId(String(id));
  const matchDocs = await Match.find({ users: id }).populate('users', 'profile.name email community status').sort({ createdAt: -1 });
  const matchIds = matchDocs.map((m) => m._id);

  const [likesSent, passesSent, likesReceived, passesReceived, messagesSent, messagesReceived, blockedBy, perMatch, activity] = await Promise.all([
    Like.countDocuments({ fromUser: id, action: 'like' }),
    Like.countDocuments({ fromUser: id, action: 'pass' }),
    Like.countDocuments({ toUser: id, action: 'like' }),
    Like.countDocuments({ toUser: id, action: 'pass' }),
    Message.countDocuments({ sender: id }),
    Message.countDocuments({ match: { $in: matchIds }, sender: { $ne: id } }),
    User.countDocuments({ blocked: id }),
    Message.aggregate([
      { $match: { match: { $in: matchIds } } },
      { $group: { _id: '$match', total: { $sum: 1 }, mine: { $sum: { $cond: [{ $eq: ['$sender', oid] }, 1, 0] } }, last: { $max: '$createdAt' } } },
    ]),
    Like.aggregate([
      { $match: { fromUser: oid, createdAt: { $gte: new Date(Date.now() - 29 * DAY) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } }, count: { $sum: 1 } } },
    ]),
  ]);

  const msgByMatch = Object.fromEntries(perMatch.map((r) => [String(r._id), r]));
  const activityMap = toMap(activity);
  const avgCompat = matchDocs.length ? Math.round(matchDocs.reduce((s, m) => s + (m.compatibility || 0), 0) / matchDocs.length) : 0;

  return {
    swipes: { likesSent, passesSent, likesReceived, passesReceived },
    matches: matchDocs.length,
    messagesSent,
    messagesReceived,
    conversations: perMatch.filter((r) => r.mine > 0 && r.total > r.mine).length,
    blockedOthers: (user.blocked || []).length,
    blockedBy,
    avgCompatibility: avgCompat,
    likeBackRate: pct(matchDocs.length, likesSent),
    profileCompleteness: profileCompleteness(user.profile),
    swipesLast30d: dayKeys(30).map((date) => ({ date, count: activityMap[date] || 0 })),
    matchList: matchDocs.map((m) => {
      const other = m.users.find((u) => u && !u._id.equals(id));
      const stats = msgByMatch[String(m._id)];
      return {
        id: String(m._id),
        partner: other ? { id: String(other._id), name: other.profile?.name || other.email, status: other.status } : null,
        compatibility: m.compatibility,
        createdAt: m.createdAt,
        messages: stats?.total || 0,
        lastMessageAt: stats?.last || null,
      };
    }),
  };
}

module.exports = { overview, timeseries, userStats, profileCompleteness };
