const mongoose = require('mongoose');

// Audit trail: every change an admin makes is recorded here.
const adminLogSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    adminEmail: { type: String },
    action: { type: String, required: true }, // e.g. 'user.update', 'admin.create'
    targetType: { type: String, enum: ['user', 'event', 'system'], default: 'user' },
    targetId: { type: String },
    targetLabel: { type: String },
    details: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

adminLogSchema.index({ createdAt: -1 });
adminLogSchema.index({ targetId: 1, createdAt: -1 });

module.exports = mongoose.model('AdminLog', adminLogSchema);
