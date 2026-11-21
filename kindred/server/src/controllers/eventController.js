const mongoose = require('mongoose');
const Event = require('../models/Event');
const User = require('../models/User');
const { EventAttendee, EventReaction, EventComment, EventPhoto, EventActivity } = require('../models/EventEngagement');
const AppError = require('../utils/AppError');

const HOUR = 60 * 60 * 1000;
const isAdmin = (u) => u.role === 'admin';
const nameOf = (u) => u?.profile?.name || u?.email || 'Someone';
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const photoUrl = (eventId, photoId) => `/api/events/${eventId}/photos/${photoId}`;

function activity(event, actor, type, detail) {
  return EventActivity.create({
    event: event._id,
    actor: actor._id,
    actorName: nameOf(actor),
    actorRole: isAdmin(actor) ? 'admin' : 'user',
    type,
    detail,
  });
}

// Members only see events in their own community; admins see everything.
async function loadEventFor(user, id) {
  const event = await Event.findById(id);
  if (!event) throw new AppError('Event not found', 404);
  if (!isAdmin(user)) {
    if (!user.profileComplete) throw new AppError('Complete your profile first', 403);
    if (event.community !== user.community) throw new AppError('Event not found', 404);
  }
  return event;
}

// Members can check in from 1 hour before the start until 2 hours after the end.
function checkInOpen(event, now = new Date()) {
  if (event.status === 'cancelled') return false;
  return now >= new Date(event.date.getTime() - HOUR) && now <= new Date(event.endsAt().getTime() + 2 * HOUR);
}

// Counts for many events at once (list page) or one (detail page).
async function countsFor(eventIds, userId) {
  const ids = eventIds.map((i) => new mongoose.Types.ObjectId(String(i)));
  const [att, react, comments, photos, mineAtt, mineReact] = await Promise.all([
    EventAttendee.aggregate([
      { $match: { event: { $in: ids } } },
      { $group: { _id: '$event', going: { $sum: { $cond: [{ $eq: ['$rsvp', 'going'] }, 1, 0] } }, interested: { $sum: { $cond: [{ $eq: ['$rsvp', 'interested'] }, 1, 0] } }, notGoing: { $sum: { $cond: [{ $eq: ['$rsvp', 'not_going'] }, 1, 0] } }, attended: { $sum: { $cond: [{ $eq: ['$attendance', 'attended'] }, 1, 0] } }, noShow: { $sum: { $cond: [{ $eq: ['$attendance', 'no_show'] }, 1, 0] } } } },
    ]),
    EventReaction.aggregate([
      { $match: { event: { $in: ids } } },
      { $group: { _id: '$event', likes: { $sum: { $cond: [{ $eq: ['$value', 'like'] }, 1, 0] } }, dislikes: { $sum: { $cond: [{ $eq: ['$value', 'dislike'] }, 1, 0] } } } },
    ]),
    EventComment.aggregate([{ $match: { event: { $in: ids } } }, { $group: { _id: '$event', n: { $sum: 1 } } }]),
    EventPhoto.aggregate([{ $match: { event: { $in: ids } } }, { $group: { _id: '$event', n: { $sum: 1 } } }]),
    userId ? EventAttendee.find({ event: { $in: ids }, user: userId }) : [],
    userId ? EventReaction.find({ event: { $in: ids }, user: userId }) : [],
  ]);
  const by = (rows) => Object.fromEntries(rows.map((r) => [String(r._id), r]));
  const [a, r, c, p] = [by(att), by(react), by(comments), by(photos)];
  const myA = Object.fromEntries(mineAtt.map((x) => [String(x.event), x]));
  const myR = Object.fromEntries(mineReact.map((x) => [String(x.event), x]));
  return (id) => {
    const k = String(id);
    return {
      going: a[k]?.going || 0,
      interested: a[k]?.interested || 0,
      notGoing: a[k]?.notGoing || 0,
      attended: a[k]?.attended || 0,
      noShow: a[k]?.noShow || 0,
      likes: r[k]?.likes || 0,
      dislikes: r[k]?.dislikes || 0,
      comments: c[k]?.n || 0,
      photos: p[k]?.n || 0,
      myRsvp: myA[k]?.rsvp || null,
      myAttendance: myA[k]?.attendance || null,
      myReaction: myR[k]?.value || null,
    };
  };
}

function eventSummary(e, counts) {
  return {
    id: String(e._id),
    community: e.community,
    title: e.title,
    description: e.description,
    city: e.city,
    venue: e.venue,
    date: e.date,
    endDate: e.endsAt(),
    sponsor: e.sponsor,
    featured: e.featured,
    capacity: e.capacity || null,
    status: e.status,
    phase: e.phase(),
    coverUrl: e.coverPhoto ? photoUrl(e._id, e.coverPhoto) : null,
    counts,
  };
}

// GET /api/events?search=&when=upcoming|past|all&community=
exports.list = async (req, res) => {
  const { search, when = 'upcoming', community } = req.query;
  const filter = {};
  if (!isAdmin(req.user)) filter.community = req.user.community;
  else if (community) filter.community = community;

  const now = new Date();
  const stillOn = { $or: [{ endDate: { $gte: now } }, { endDate: null, date: { $gte: new Date(now - 3 * HOUR) } }] };
  const and = [];
  if (when === 'upcoming') and.push(stillOn, { status: { $ne: 'completed' } });
  if (when === 'past') and.push({ $or: [{ $nor: [stillOn] }, { status: 'completed' }] });
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    and.push({ $or: [{ title: rx }, { description: rx }, { city: rx }, { venue: rx }, { sponsor: rx }] });
  }
  if (and.length) filter.$and = and;

  const events = await Event.find(filter).sort(when === 'past' ? { date: -1 } : { featured: -1, date: 1 }).limit(100);
  const counts = await countsFor(events.map((e) => e._id), req.user._id);
  res.json({ success: true, data: events.map((e) => eventSummary(e, counts(e._id))) });
};

// GET /api/events/:id — everything the event page needs.
exports.detail = async (req, res) => {
  const event = await loadEventFor(req.user, req.params.id);
  const admin = isAdmin(req.user);
  const [counts, attendees, comments, photos] = await Promise.all([
    countsFor([event._id], req.user._id),
    EventAttendee.find({ event: event._id }).populate('user', 'profile.name profile.photoUrl community email role').sort({ updatedAt: -1 }),
    EventComment.find({ event: event._id }).populate('user', 'profile.name profile.photoUrl community role').sort({ createdAt: -1 }).limit(200),
    EventPhoto.find({ event: event._id }).populate('uploader', 'profile.name email').sort({ createdAt: -1 }),
  ]);
  const me = String(req.user._id);
  const mine = attendees.find((a) => a.user && String(a.user._id) === me);
  const canUpload = admin || (mine && (mine.rsvp === 'going' || mine.attendance === 'attended'));

  res.json({
    success: true,
    data: {
      event: eventSummary(event, counts(event._id)),
      permissions: {
        canEdit: admin,
        canCheckIn: !admin && checkInOpen(event) && mine?.attendance !== 'attended',
        checkInOpen: checkInOpen(event),
        canUpload: Boolean(canUpload),
        canMarkAttendance: admin,
      },
      // Members see who is going or came; admins also see who said no and who didn't turn up.
      attendees: attendees
        .filter((a) => a.user && (admin || a.rsvp !== 'not_going'))
        .map((a) => ({
          userId: String(a.user._id),
          name: nameOf(a.user),
          community: a.user.community,
          photoUrl: a.user.profile?.photoUrl,
          rsvp: a.rsvp,
          attendance: admin || a.attendance === 'attended' ? a.attendance : 'pending',
          checkedInAt: a.checkedInAt,
          markedBy: admin ? a.markedBy : undefined,
          email: admin ? a.user.email : undefined,
          isMe: String(a.user._id) === me,
        })),
      comments: comments
        .filter((c) => c.user)
        .map((c) => ({
          id: String(c._id),
          kind: c.kind,
          text: c.text,
          createdAt: c.createdAt,
          author: { id: String(c.user._id), name: nameOf(c.user), community: c.user.community, photoUrl: c.user.profile?.photoUrl, isAdmin: c.user.role === 'admin' },
          mine: String(c.user._id) === me,
          canDelete: admin || String(c.user._id) === me,
        })),
      photos: photos.map((p) => ({
        id: String(p._id),
        url: photoUrl(event._id, p._id),
        caption: p.caption,
        createdAt: p.createdAt,
        uploader: nameOf(p.uploader),
        isCover: event.coverPhoto ? String(event.coverPhoto) === String(p._id) : false,
        canDelete: admin || (p.uploader && String(p.uploader._id) === me),
      })),
    },
  });
};

// POST /api/events/:id/rsvp { rsvp }
exports.rsvp = async (req, res) => {
  if (isAdmin(req.user)) throw new AppError('Admins manage attendance from the attendee list', 400);
  const event = await loadEventFor(req.user, req.params.id);
  const phase = event.phase();
  if (phase === 'cancelled') throw new AppError('This event was cancelled', 400);
  if (phase === 'ended' || phase === 'completed') throw new AppError('This event has already happened', 400);

  const { rsvp } = req.body;
  if (rsvp === 'going' && event.capacity) {
    const going = await EventAttendee.countDocuments({ event: event._id, rsvp: 'going', user: { $ne: req.user._id } });
    if (going >= event.capacity) throw new AppError('This event is full', 409);
  }
  await EventAttendee.findOneAndUpdate(
    { event: event._id, user: req.user._id },
    { $set: { rsvp }, $setOnInsert: { attendance: 'pending' } },
    { upsert: true, new: true }
  );
  await activity(event, req.user, 'rsvp', { going: 'is going', interested: 'is interested', not_going: 'is not going' }[rsvp]);
  res.json({ success: true, data: { rsvp } });
};

// POST /api/events/:id/checkin — "I'm here", only while the event is on.
exports.checkIn = async (req, res) => {
  if (isAdmin(req.user)) throw new AppError('Admins mark attendance from the attendee list', 400);
  const event = await loadEventFor(req.user, req.params.id);
  if (!checkInOpen(event)) throw new AppError('Check-in opens 1 hour before the event and closes 2 hours after it ends', 400);
  const row = await EventAttendee.findOneAndUpdate(
    { event: event._id, user: req.user._id },
    { $set: { attendance: 'attended', checkedInAt: new Date(), markedBy: 'self' }, $setOnInsert: { rsvp: 'going' } },
    { upsert: true, new: true }
  );
  await activity(event, req.user, 'checkin', 'checked in');
  res.json({ success: true, data: { attendance: row.attendance, checkedInAt: row.checkedInAt } });
};

// POST /api/events/:id/attendance { userId, attendance } — admin marks who came.
exports.markAttendance = async (req, res) => {
  const event = await loadEventFor(req.user, req.params.id);
  const { userId, attendance } = req.body;
  const member = await User.findById(userId);
  if (!member || member.role === 'admin') throw new AppError('Member not found', 404);
  if (member.community !== event.community) throw new AppError('This member is not in the event community', 400);
  await EventAttendee.findOneAndUpdate(
    { event: event._id, user: member._id },
    { $set: { attendance, markedBy: 'admin', checkedInAt: attendance === 'attended' ? new Date() : null }, $setOnInsert: { rsvp: 'going' } },
    { upsert: true, new: true }
  );
  const words = { attended: 'attended', no_show: 'did not come', pending: 'not marked yet' }[attendance];
  await activity(event, req.user, 'attendance', `marked ${nameOf(member)} as ${words}`);
  res.json({ success: true, data: { userId, attendance } });
};

// POST /api/events/:id/reaction { value: like | dislike | none }
exports.react = async (req, res) => {
  const event = await loadEventFor(req.user, req.params.id);
  const { value } = req.body;
  if (value === 'none') {
    await EventReaction.deleteOne({ event: event._id, user: req.user._id });
  } else {
    await EventReaction.findOneAndUpdate({ event: event._id, user: req.user._id }, { $set: { value } }, { upsert: true });
    await activity(event, req.user, 'reaction', value === 'like' ? 'liked the event' : 'disliked the event');
  }
  const counts = (await countsFor([event._id], req.user._id))(event._id);
  res.json({ success: true, data: { likes: counts.likes, dislikes: counts.dislikes, myReaction: counts.myReaction } });
};

// POST /api/events/:id/comments { text, kind }
exports.addComment = async (req, res) => {
  const event = await loadEventFor(req.user, req.params.id);
  const c = await EventComment.create({ event: event._id, user: req.user._id, text: req.body.text, kind: req.body.kind });
  const label = { general: 'commented', liked: 'shared what they liked', improve: 'suggested an improvement' }[c.kind];
  await activity(event, req.user, 'comment', `${label}: "${c.text.slice(0, 80)}"`);
  res.status(201).json({ success: true, data: { id: String(c._id) } });
};

// DELETE /api/events/:id/comments/:commentId — the author or an admin.
exports.deleteComment = async (req, res) => {
  const event = await loadEventFor(req.user, req.params.id);
  const c = await EventComment.findOne({ _id: req.params.commentId, event: event._id });
  if (!c) throw new AppError('Comment not found', 404);
  if (!isAdmin(req.user) && !c.user.equals(req.user._id)) throw new AppError('You can only delete your own comments', 403);
  await c.deleteOne();
  await activity(event, req.user, 'comment_deleted', `removed a comment: "${c.text.slice(0, 80)}"`);
  res.json({ success: true, message: 'Comment deleted' });
};

// POST /api/events/:id/photos  (multipart: photo, caption?, cover?)
exports.uploadPhoto = async (req, res) => {
  const event = await loadEventFor(req.user, req.params.id);
  if (!req.file) throw new AppError('Choose a photo to upload', 400);
  if (!isAdmin(req.user)) {
    const mine = await EventAttendee.findOne({ event: event._id, user: req.user._id });
    if (!mine || !(mine.rsvp === 'going' || mine.attendance === 'attended')) {
      throw new AppError('RSVP "Going" or check in to add photos', 403);
    }
  }
  const caption = String(req.body.caption || '').trim().slice(0, 200);
  const photo = await EventPhoto.create({
    event: event._id,
    uploader: req.user._id,
    caption,
    contentType: req.file.mimetype,
    size: req.file.size,
    data: req.file.buffer,
  });
  await activity(event, req.user, 'photo', caption ? `added a photo: "${caption}"` : 'added a photo');
  if (isAdmin(req.user) && (req.body.cover === 'true' || !event.coverPhoto)) {
    event.coverPhoto = photo._id;
    await event.save();
    await activity(event, req.user, 'cover', 'set the cover photo');
  }
  res.status(201).json({ success: true, data: { id: String(photo._id), url: photoUrl(event._id, photo._id) } });
};

// GET /api/events/:id/photos/:photoId — streams the image.
exports.getPhoto = async (req, res) => {
  const event = await loadEventFor(req.user, req.params.id);
  const photo = await EventPhoto.findOne({ _id: req.params.photoId, event: event._id }).select('+data');
  if (!photo) throw new AppError('Photo not found', 404);
  res.set('Content-Type', photo.contentType);
  res.set('Cache-Control', 'private, max-age=86400');
  res.send(photo.data);
};

// POST /api/events/:id/photos/:photoId/cover — admin only.
exports.setCover = async (req, res) => {
  const event = await loadEventFor(req.user, req.params.id);
  const photo = await EventPhoto.findOne({ _id: req.params.photoId, event: event._id });
  if (!photo) throw new AppError('Photo not found', 404);
  event.coverPhoto = photo._id;
  await event.save();
  await activity(event, req.user, 'cover', 'changed the cover photo');
  res.json({ success: true, data: { coverUrl: photoUrl(event._id, photo._id) } });
};

// DELETE /api/events/:id/photos/:photoId — the uploader or an admin.
exports.deletePhoto = async (req, res) => {
  const event = await loadEventFor(req.user, req.params.id);
  const photo = await EventPhoto.findOne({ _id: req.params.photoId, event: event._id });
  if (!photo) throw new AppError('Photo not found', 404);
  if (!isAdmin(req.user) && !photo.uploader.equals(req.user._id)) throw new AppError('You can only delete your own photos', 403);
  await photo.deleteOne();
  if (event.coverPhoto && event.coverPhoto.equals(photo._id)) {
    event.coverPhoto = undefined;
    await event.save();
  }
  await activity(event, req.user, 'photo_deleted', 'removed a photo');
  res.json({ success: true, message: 'Photo deleted' });
};

// GET /api/events/:id/activity — admin only.
exports.activityLog = async (req, res) => {
  const event = await loadEventFor(req.user, req.params.id);
  const rows = await EventActivity.find({ event: event._id }).sort({ createdAt: -1 }).limit(300);
  res.json({
    success: true,
    data: rows.map((r) => ({ id: String(r._id), type: r.type, actorName: r.actorName, actorRole: r.actorRole, detail: r.detail, createdAt: r.createdAt })),
  });
};

// Used by the admin controller when an event is created, edited or deleted.
exports.logEventActivity = activity;
exports.deleteEventCascade = async (eventId) => {
  await Promise.all([
    EventAttendee.deleteMany({ event: eventId }),
    EventReaction.deleteMany({ event: eventId }),
    EventComment.deleteMany({ event: eventId }),
    EventPhoto.deleteMany({ event: eventId }),
    EventActivity.deleteMany({ event: eventId }),
  ]);
};
exports.deleteUserEventData = async (userId) => {
  await Promise.all([
    EventAttendee.deleteMany({ user: userId }),
    EventReaction.deleteMany({ user: userId }),
    EventComment.deleteMany({ user: userId }),
    EventPhoto.deleteMany({ uploader: userId }),
  ]);
};
