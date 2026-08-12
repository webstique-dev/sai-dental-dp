const mongoose = require('mongoose');

const FOLLOW_UP_TYPES = [
  'review',
  'post-operative-review',
  'treatment-continuation',
  'treatment-completion',
  'periodic-check',
  'other',
];

const FOLLOW_UP_STATUSES = [
  'planned',
  'scheduled',
  'completed',
  'missed',
  'cancelled',
  'rescheduled',
];

const REMINDER_STATUSES = ['pending', 'sent', 'confirmed', 'completed', 'missed'];

const followUpSchema = new mongoose.Schema(
  {
    followUpNumber: { type: String, unique: true, index: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    visit: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit' },
    consultation: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation', index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    treatmentRecord: { type: mongoose.Schema.Types.ObjectId, ref: 'TreatmentRecord' },
    treatmentPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'TreatmentPlan' },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    toothNumber: { type: Number, min: 0, max: 48, default: 0 },
    hasTooth: { type: Boolean, default: false },
    type: { type: String, enum: FOLLOW_UP_TYPES, default: 'review' },
    followUpDate: { type: Date, required: true },
    followUpTime: { type: String, trim: true, default: '' },
    reason: { type: String, trim: true, default: '' },
    instructions: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    status: { type: String, enum: FOLLOW_UP_STATUSES, default: 'planned' },
    // Reminder preparation (no SMS/email infrastructure yet — exposed to reminder layer).
    reminder: {
      status: { type: String, enum: REMINDER_STATUSES, default: 'pending' },
      reminderDate: { type: Date },
    },
    completedAt: { type: Date },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedNotes: { type: String, trim: true, default: '' },
    cancelledAt: { type: Date },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelReason: { type: String, trim: true, default: '' },
    isArchived: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

followUpSchema.index({ patient: 1, followUpDate: -1 });
followUpSchema.index({ followUpDate: 1, status: 1 });
followUpSchema.index({ doctor: 1, followUpDate: 1 });

module.exports = mongoose.model('FollowUp', followUpSchema);
module.exports.FOLLOW_UP_TYPES = FOLLOW_UP_TYPES;
module.exports.FOLLOW_UP_STATUSES = FOLLOW_UP_STATUSES;
module.exports.REMINDER_STATUSES = REMINDER_STATUSES;
