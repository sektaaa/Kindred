const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
  {
    // Always stored sorted so (a,b) and (b,a) map to the same pair.
    users: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      validate: (v) => v.length === 2,
    },
    pairKey: { type: String, required: true, unique: true },
    compatibility: { type: Number, default: 0 },
    lastMessageAt: { type: Date },
  },
  { timestamps: true }
);

matchSchema.index({ users: 1 });

matchSchema.statics.pairKeyFor = (a, b) => [String(a), String(b)].sort().join('_');

module.exports = mongoose.model('Match', matchSchema);
