const Match = require('../models/Match');
const Message = require('../models/Message');
const Event = require('../models/Event');
const AppError = require('../utils/AppError');
const { publicProfile } = require('../services/serialize');

// Authorization helper: only the two people in a match can read or write it.
async function loadMatchFor(user, matchId) {
  const match = await Match.findById(matchId).populate('users');
  if (!match || !match.users.some((u) => u && u._id.equals(user._id))) {
    throw new AppError('Match not found', 404);
  }
  return match;
}

// GET /api/matches
exports.listMatches = async (req, res) => {
  const matches = await Match.find({ users: req.user._id })
    .populate('users')
    .sort({ lastMessageAt: -1, createdAt: -1 });

  const data = await Promise.all(
    matches.map(async (m) => {
      const other = m.users.find((u) => u && !u._id.equals(req.user._id));
      if (!other) return null;
      const last = await Message.findOne({ match: m._id }).sort({ createdAt: -1 });
      return {
        id: String(m._id),
        compatibility: m.compatibility,
        createdAt: m.createdAt,
        profile: publicProfile(other, { isMatch: true }),
        lastMessage: last ? { text: last.text, mine: last.sender.equals(req.user._id), createdAt: last.createdAt } : null,
      };
    })
  );
  res.json({ success: true, data: data.filter(Boolean) });
};

// DELETE /api/matches/:id — unmatch
exports.unmatch = async (req, res) => {
  const match = await loadMatchFor(req.user, req.params.id);
  await Message.deleteMany({ match: match._id });
  await match.deleteOne();
  res.json({ success: true, message: 'Unmatched' });
};

// GET /api/matches/:id/messages?after=<ISO date>  (polling-friendly)
exports.getMessages = async (req, res) => {
  const match = await loadMatchFor(req.user, req.params.id);
  const filter = { match: match._id };
  if (req.query.after) {
    const after = new Date(req.query.after);
    if (Number.isNaN(after.getTime())) throw new AppError('Invalid "after" date', 400);
    filter.createdAt = { $gt: after };
  }
  const messages = await Message.find(filter).sort({ createdAt: 1 }).limit(200);
  const other = match.users.find((u) => !u._id.equals(req.user._id));
  res.json({
    success: true,
    data: {
      match: { id: String(match._id), compatibility: match.compatibility, profile: publicProfile(other, { isMatch: true }) },
      messages: messages.map((m) => ({ id: String(m._id), text: m.text, mine: m.sender.equals(req.user._id), createdAt: m.createdAt })),
    },
  });
};

// POST /api/matches/:id/messages
exports.sendMessage = async (req, res) => {
  const match = await loadMatchFor(req.user, req.params.id);
  const msg = await Message.create({ match: match._id, sender: req.user._id, text: req.body.text });
  match.lastMessageAt = msg.createdAt;
  await match.save();
  res.status(201).json({ success: true, data: { id: String(msg._id), text: msg.text, mine: true, createdAt: msg.createdAt } });
};

// GET /api/events — curated events for your community
exports.listEvents = async (req, res) => {
  const events = await Event.find({ community: req.user.community, date: { $gte: new Date() } }).sort({ featured: -1, date: 1 });
  res.json({ success: true, data: events });
};
