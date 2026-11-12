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
    venue: { type: String, trim: true },
    sponsor: { type: String, trim: true },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Event', eventSchema);
