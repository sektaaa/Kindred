const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Like = require('../models/Like');
const Match = require('../models/Match');
const Message = require('../models/Message');
const Event = require('../models/Event');
const AdminLog = require('../models/AdminLog');
const AppError = require('../utils/AppError');
const analytics = require('../services/analyticsService');
const { adminUser, privateUser } = require('../services/serialize');
const { adminUserUpdateSchemaFor } = require('../validators/adminSchemas');
const { logEventActivity, deleteEventCascade, deleteUserEventData } = require('./eventController');

const label = (u) => u.profile?.name ? `${u.profile.name} <${u.email}>` : u.email;

async function log(req, action, target = {}, details) {
  await AdminLog.create({
    admin: req.user._id,
    adminEmail: req.user.email,
    action,
    targetType: target.type || 'user',
    targetId: target.id ? String(target.id) : undefined,
    targetLabel: target.label,
    details,
  });
}

async function findUserOr404(id) {
  const user = await User.findById(id);
  if (!user) throw new AppError('User not found', 404);
  return user;
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Removes a member and everything that belongs to them.
async function deleteUserCascade(user) {
  const matches = await Match.find({ users: user._id }).select('_id');
  const matchIds = matches.map((m) => m._id);
  await Promise.all([
    Message.deleteMany({ match: { $in: matchIds } }),
    Match.deleteMany({ _id: { $in: matchIds } }),
    Like.deleteMany({ $or: [{ fromUser: user._id }, { toUser: user._id }] }),
    User.updateMany({ blocked: user._id }, { $pull: { blocked: user._id } }),
    deleteUserEventData(user._id),
  ]);
  await user.deleteOne();
}

// ================= Analytics =================
exports.overview = async (req, res) => {
  res.json({ success: true, data: await analytics.overview() });
};

exports.timeseries = async (req, res) => {
  res.json({ success: true, data: await analytics.timeseries(req.query.days) });
};

// ================= Users =================
exports.listUsers = async (req, res) => {
  const { search, community, plan, status, role, profile, sort, page, limit } = req.query;
  const filter = {};
  if (role) filter.role = role;
  else filter.role = { $ne: 'admin' };
  if (community) filter.community = community;
  if (plan) filter.plan = plan;
  if (status) filter.status = status;
  if (profile) filter.profileComplete = profile === 'complete';
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ email: rx }, { 'profile.name': rx }, { 'profile.city': rx }];
  }
  const sortBy = { newest: { createdAt: -1 }, oldest: { createdAt: 1 }, active: { lastActiveAt: -1 }, name: { 'profile.name': 1 } }[sort];

  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter).sort(sortBy).skip((page - 1) * limit).limit(limit),
  ]);

  // Per-row counts for just this page, in three grouped queries.
  const ids = users.map((u) => u._id);
  const [likeRows, matchRows, msgRows] = await Promise.all([
    Like.aggregate([{ $match: { fromUser: { $in: ids }, action: 'like' } }, { $group: { _id: '$fromUser', n: { $sum: 1 } } }]),
    Match.aggregate([{ $match: { users: { $in: ids } } }, { $unwind: '$users' }, { $match: { users: { $in: ids } } }, { $group: { _id: '$users', n: { $sum: 1 } } }]),
    Message.aggregate([{ $match: { sender: { $in: ids } } }, { $group: { _id: '$sender', n: { $sum: 1 } } }]),
  ]);
  const m = (rows) => Object.fromEntries(rows.map((r) => [String(r._id), r.n]));
  const [likesBy, matchesBy, msgsBy] = [m(likeRows), m(matchRows), m(msgRows)];

  res.json({
    success: true,
    data: {
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      users: users.map((u) => ({
        ...adminUser(u),
        counts: { likes: likesBy[String(u._id)] || 0, matches: matchesBy[String(u._id)] || 0, messages: msgsBy[String(u._id)] || 0 },
      })),
    },
  });
};

exports.getUser = async (req, res) => {
  const user = await findUserOr404(req.params.id);
  const [stats, history] = await Promise.all([
    user.role === 'admin' ? null : analytics.userStats(user),
    AdminLog.find({ targetId: String(user._id) }).sort({ createdAt: -1 }).limit(20),
  ]);
  res.json({ success: true, data: { user: adminUser(user), stats, history } });
};

exports.updateUser = async (req, res) => {
  const user = await findUserOr404(req.params.id);
  const isSelf = user._id.equals(req.user._id);
  const nextCommunity = req.body?.community || user.community;
  const parsed = adminUserUpdateSchemaFor(nextCommunity).safeParse(req.body);
  if (!parsed.success) {
    throw new AppError('Validation failed', 400, parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })));
  }
  const body = parsed.data;
  if (isSelf && body.status === 'suspended') throw new AppError('You cannot suspend your own account', 400);

  const changes = {};
  if (body.email && body.email !== user.email) {
    if (await User.exists({ email: body.email, _id: { $ne: user._id } })) throw new AppError('That email is already in use', 409);
    changes.email = [user.email, body.email];
    user.email = body.email;
  }
  if (body.community && body.community !== user.community) {
    changes.community = [user.community, body.community];
    user.community = body.community;
    // Old community vocabulary no longer applies.
    if (!body.profile?.values) user.profile.values = [];
    if (!body.profile?.boundaries) user.profile.boundaries = [];
    if (!body.profile?.identityTags) user.profile.identityTags = [];
    // Their existing swipes and matches were in the old community.
    await Like.deleteMany({ $or: [{ fromUser: user._id }, { toUser: user._id }] });
  }
  for (const key of ['plan', 'status']) {
    if (body[key] && body[key] !== user[key]) {
      changes[key] = [user[key], body[key]];
      user[key] = body[key];
    }
  }
  if (body.visibility && body.visibility.identityTags !== user.visibility?.identityTags) {
    changes.visibility = [user.visibility?.identityTags, body.visibility.identityTags];
    user.visibility = body.visibility;
  }
  if (body.profile) {
    // Only record fields whose value actually changed.
    const plain = (v) => JSON.stringify(v?.toObject ? v.toObject() : v ?? null);
    for (const [k, v] of Object.entries(body.profile)) {
      if (k === 'commStyle') {
        const before = user.profile.commStyle?.toObject?.() || user.profile.commStyle || {};
        const after = { ...before, ...v };
        if (plain(before) !== plain(after)) {
          user.profile.commStyle = after;
          changes['profile.commStyle'] = 'updated';
        }
      } else if (plain(user.profile[k]) !== plain(v)) {
        changes[`profile.${k}`] = Array.isArray(v) ? 'updated' : [user.profile[k], v];
        user.profile[k] = v;
      }
    }
  }
  if (user.role !== 'admin') {
    const p = user.profile;
    user.profileComplete = Boolean(p.name && p.age && p.city && p.values?.length);
  }

  await user.save();
  await log(req, 'user.update', { id: user._id, label: label(user) }, changes);
  res.json({ success: true, data: { user: adminUser(user) } });
};

exports.resetPassword = async (req, res) => {
  const user = await findUserOr404(req.params.id);
  user.passwordHash = await bcrypt.hash(req.body.password, 12);
  await user.save();
  await log(req, 'user.reset_password', { id: user._id, label: label(user) });
  res.json({ success: true, message: 'Password updated' });
};

exports.setRole = async (req, res) => {
  const user = await findUserOr404(req.params.id);
  const { role } = req.body;
  if (user.role === role) return res.json({ success: true, data: { user: adminUser(user) } });
  if (user._id.equals(req.user._id)) throw new AppError('You cannot change your own role', 400);
  if (role === 'user') {
    if ((await User.countDocuments({ role: 'admin' })) <= 1) throw new AppError('Cannot remove the last admin', 400);
    if (!user.community) throw new AppError('This admin has no community, so they cannot become a member. Delete the account instead.', 400);
  }
  const before = user.role;
  user.role = role;
  await user.save();
  await log(req, role === 'admin' ? 'user.promote' : 'admin.demote', { id: user._id, label: label(user) }, { role: [before, role] });
  res.json({ success: true, data: { user: adminUser(user) } });
};

exports.deleteUser = async (req, res) => {
  const user = await findUserOr404(req.params.id);
  if (user._id.equals(req.user._id)) throw new AppError('You cannot delete your own account', 400);
  if (user.role === 'admin' && (await User.countDocuments({ role: 'admin' })) <= 1) throw new AppError('Cannot delete the last admin', 400);
  const lbl = label(user);
  await deleteUserCascade(user);
  await log(req, user.role === 'admin' ? 'admin.delete' : 'user.delete', { id: req.params.id, label: lbl });
  res.json({ success: true, message: 'User deleted' });
};

// ================= Admins =================
exports.listAdmins = async (req, res) => {
  const admins = await User.find({ role: 'admin' }).sort({ createdAt: 1 }).populate('createdBy', 'email profile.name');
  res.json({
    success: true,
    data: admins.map((a) => ({
      ...adminUser(a),
      isYou: a._id.equals(req.user._id),
      createdBy: a.createdBy ? { id: String(a.createdBy._id), name: a.createdBy.profile?.name, email: a.createdBy.email } : null,
    })),
  });
};

exports.createAdmin = async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.exists({ email })) throw new AppError('An account with this email already exists. Promote it from its user page instead.', 409);
  const admin = await User.create({
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: 'admin',
    profile: { name },
    createdBy: req.user._id,
  });
  await log(req, 'admin.create', { id: admin._id, label: label(admin) });
  res.status(201).json({ success: true, data: { admin: adminUser(admin) } });
};

exports.updateMe = async (req, res) => {
  const me = await User.findById(req.user._id).select('+passwordHash');
  const { name, currentPassword, newPassword } = req.body;
  if (name) me.profile.name = name;
  if (newPassword) {
    if (!(await bcrypt.compare(currentPassword, me.passwordHash))) throw new AppError('Current password is incorrect', 400);
    me.passwordHash = await bcrypt.hash(newPassword, 12);
  }
  await me.save();
  await log(req, 'admin.update_self', { id: me._id, label: label(me) }, { name: Boolean(name), password: Boolean(newPassword) });
  res.json({ success: true, data: { user: privateUser(me) } });
};

// ================= Events =================
exports.listEvents = async (req, res) => {
  const events = await Event.find({}).sort({ date: -1 });
  res.json({ success: true, data: events });
};

exports.createEvent = async (req, res) => {
  const event = await Event.create({ ...req.body, createdBy: req.user._id });
  await logEventActivity(event, req.user, 'created', 'created the event');
  await log(req, 'event.create', { type: 'event', id: event._id, label: event.title });
  res.status(201).json({ success: true, data: event });
};

exports.updateEvent = async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new AppError('Event not found', 404);
  const before = event.status;
  Object.assign(event, req.body);
  await event.save();
  const fields = Object.keys(req.body).filter((k) => k !== 'status');
  if (req.body.status && req.body.status !== before) await logEventActivity(event, req.user, 'status', `changed status from ${before} to ${event.status}`);
  if (fields.length) await logEventActivity(event, req.user, 'edited', `edited ${fields.join(', ')}`);
  await log(req, 'event.update', { type: 'event', id: event._id, label: event.title }, Object.keys(req.body));
  res.json({ success: true, data: event });
};

exports.deleteEvent = async (req, res) => {
  const event = await Event.findByIdAndDelete(req.params.id);
  if (!event) throw new AppError('Event not found', 404);
  await deleteEventCascade(event._id);
  await log(req, 'event.delete', { type: 'event', id: req.params.id, label: event.title });
  res.json({ success: true, message: 'Event deleted' });
};

// ================= Audit log =================
exports.logs = async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const logs = await AdminLog.find({}).sort({ createdAt: -1 }).limit(limit);
  res.json({ success: true, data: logs });
};
