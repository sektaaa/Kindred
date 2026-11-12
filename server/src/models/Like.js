const mongoose = require('mongoose');

// One document per swipe. action = 'like' | 'pass'.
const likeSchema = new mongoose.Schema(
  {
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, enum: ['like', 'pass'], required: true },
  },
  { timestamps: true }
);

likeSchema.index({ fromUser: 1, toUser: 1 }, { unique: true });
likeSchema.index({ toUser: 1, action: 1 });
likeSchema.index({ fromUser: 1, createdAt: -1 });

module.exports = mongoose.model('Like', likeSchema);
