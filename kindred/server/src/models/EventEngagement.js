const mongoose = require('mongoose');

const ref = (model) => ({ type: mongoose.Schema.Types.ObjectId, ref: model, required: true });

// One row per member per event: their RSVP, and whether they actually came.
const attendeeSchema = new mongoose.Schema(
  {
    event: ref('Event'),
    user: ref('User'),
    rsvp: { type: String, enum: ['going', 'interested', 'not_going'], required: true },
    attendance: { type: String, enum: ['pending', 'attended', 'no_show'], default: 'pending' },
    checkedInAt: { type: Date },
    markedBy: { type: String, enum: ['self', 'admin'] },
  },
  { timestamps: true }
);
attendeeSchema.index({ event: 1, user: 1 }, { unique: true });
attendeeSchema.index({ user: 1 });

// Like or dislike, one per member per event.
const reactionSchema = new mongoose.Schema(
  {
    event: ref('Event'),
    user: ref('User'),
    value: { type: String, enum: ['like', 'dislike'], required: true },
  },
  { timestamps: true }
);
reactionSchema.index({ event: 1, user: 1 }, { unique: true });

// Comments and feedback: what people liked, and what could be better.
const commentSchema = new mongoose.Schema(
  {
    event: ref('Event'),
    user: ref('User'),
    kind: { type: String, enum: ['general', 'liked', 'improve'], default: 'general' },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);
commentSchema.index({ event: 1, createdAt: -1 });

// Photos are stored in MongoDB so they survive redeploys on hosts with no disk (Render, Vercel).
const photoSchema = new mongoose.Schema(
  {
    event: ref('Event'),
    uploader: ref('User'),
    caption: { type: String, trim: true, maxlength: 200 },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true, select: false },
  },
  { timestamps: true }
);
photoSchema.index({ event: 1, createdAt: -1 });

// Everything that happens on an event, for the admin activity log.
const activitySchema = new mongoose.Schema(
  {
    event: ref('Event'),
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorName: { type: String },
    actorRole: { type: String, enum: ['user', 'admin'], default: 'user' },
    type: {
      type: String,
      enum: ['created', 'edited', 'status', 'rsvp', 'checkin', 'attendance', 'reaction', 'comment', 'comment_deleted', 'photo', 'photo_deleted', 'cover'],
      required: true,
    },
    detail: { type: String },
  },
  { timestamps: true }
);
activitySchema.index({ event: 1, createdAt: -1 });

module.exports = {
  EventAttendee: mongoose.model('EventAttendee', attendeeSchema),
  EventReaction: mongoose.model('EventReaction', reactionSchema),
  EventComment: mongoose.model('EventComment', commentSchema),
  EventPhoto: mongoose.model('EventPhoto', photoSchema),
  EventActivity: mongoose.model('EventActivity', activitySchema),
};
