const mongoose = require('mongoose');

const APPOINTMENT_SOURCES = ['walk-in', 'phone', 'website', 'existing', 'other'];
const APPOINTMENT_STATUSES = [
  'requested',
  'scheduled',
  'confirmed',
  'checked-in',
  'in-consultation',
  'completed',
  'cancelled',
  'no-show',
];

const appointmentSchema = new mongoose.Schema(
  {
    appointmentNumber: { type: String, unique: true, index: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    visit: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit', default: null },
    date: { type: Date, required: true },
    time: { type: String, trim: true },
    type: { type: String, trim: true, default: 'New Consultation' },
    reason: { type: String, trim: true },
    notes: { type: String, trim: true },
    source: { type: String, enum: APPOINTMENT_SOURCES, default: 'walk-in' },
    status: { type: String, enum: APPOINTMENT_STATUSES, default: 'scheduled', index: true },
    token: { type: String, trim: true },
  },
  { timestamps: true },
);

appointmentSchema.index({ date: 1, status: 1 });
appointmentSchema.index({ patient: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = { Appointment, APPOINTMENT_STATUSES };