const mongoose = require('mongoose');

const VISIT_STATUSES = ['registered', 'in-progress', 'completed', 'cancelled'];

const visitSchema = new mongoose.Schema(
  {
    opNumber: { type: String, unique: true, required: true, index: true },
    opDate: { type: Date, required: true, default: Date.now },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    consultation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
      default: null,
    },
    status: { type: String, enum: VISIT_STATUSES, default: 'registered', index: true },
    token: { type: String, trim: true },
    source: { type: String, trim: true, default: 'walk-in' },
    isArchived: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

visitSchema.index({ patient: 1, opDate: -1 });

const Visit = mongoose.model('Visit', visitSchema);

module.exports = { Visit, VISIT_STATUSES };