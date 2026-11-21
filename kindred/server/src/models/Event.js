const mongoose = require('mongoose');
const { COMMUNITY_KEYS } = require('../config/communities');

// Curated, community-specific events — one of the three revenue streams
// (organisers / brands pay for featured listings).
const eventSchema = new mongoose.Schema(
  {
    community: { type: String, enum: COMMUNITY_KEYS, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    city: { type: String, trim: true },
    date: { type: Date, required: true },
    endDate: { type: Date },
    venue: { type: String, trim: true },
    sponsor: { type: String, trim: true },
    featured: { type: Boolean, default: false },
    capacity: { type: Number, min: 1 },
    // Admin-controlled lifecycle. "Upcoming / happening now / ended" is worked out from the dates.
    status: { type: String, enum: ['scheduled', 'cancelled', 'completed'], default: 'scheduled', index: true },
    coverPhoto: { type: mongoose.Schema.Types.ObjectId, ref: 'EventPhoto' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

eventSchema.index({ title: 'text', description: 'text', city: 'text', venue: 'text' });

// When does the event end? Defaults to 3 hours after it starts.
eventSchema.methods.endsAt = function () {
  return this.endDate || new Date(this.date.getTime() + 3 * 60 * 60 * 1000);
};

// upcoming | live | ended | cancelled | completed
eventSchema.methods.phase = function (now = new Date()) {
  if (this.status === 'cancelled') return 'cancelled';
  if (this.status === 'completed') return 'completed';
  if (now < this.date) return 'upcoming';
  if (now <= this.endsAt()) return 'live';
  return 'ended';
};

module.exports = mongoose.model('Event', eventSchema);
