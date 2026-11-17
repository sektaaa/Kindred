const mongoose = require('mongoose');
const { COMMUNITY_KEYS, REPLY_PACE, DIRECTNESS } = require('../config/communities');

const profileSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 50 },
    age: { type: Number, min: 18, max: 100 },
    city: { type: String, trim: true, maxlength: 60 },
    bio: { type: String, trim: true, maxlength: 500 },
    photoUrl: { type: String, trim: true },
    values: [{ type: String }],
    boundaries: [{ type: String }],
    sensoryPrefs: [{ type: String }],
    identityTags: [{ type: String }],
    commStyle: {
      prefersText: { type: Boolean, default: true },
      replyPace: { type: String, enum: REPLY_PACE, default: 'same day' },
      directness: { type: String, enum: DIRECTNESS, default: 'medium' },
    },
    lookingFor: { type: String, enum: ['friendship', 'dating', 'long-term'], default: 'dating' },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    // Admins manage the platform and don't date, so they don't need a community.
    role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
    status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
    community: {
      type: String,
      enum: COMMUNITY_KEYS,
      required: function () { return this.role !== 'admin'; },
      index: true,
    },
    lastActiveAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    profile: { type: profileSchema, default: () => ({}) },
    profileComplete: { type: Boolean, default: false },
    // Privacy-by-design: identity tags (e.g. "ADHD", "sober 1-5 years") are sensitive.
    visibility: {
      identityTags: { type: String, enum: ['everyone', 'matches', 'nobody'], default: 'matches' },
    },
    plan: { type: String, enum: ['free', 'premium'], default: 'free' },
    blocked: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

userSchema.index({ community: 1, profileComplete: 1 });

module.exports = mongoose.model('User', userSchema);
