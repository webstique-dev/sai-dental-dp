const mongoose = require('mongoose');

const PRESCRIPTION_STATUSES = ['draft', 'issued', 'partially-dispensed', 'dispensed', 'cancelled'];

const PRESCRIPTION_FREQUENCIES = [
  'once-daily',
  'twice-daily',
  'three-times-daily',
  'four-times-daily',
  'every-4-hours',
  'every-6-hours',
  'every-8-hours',
  'every-12-hours',
  'as-needed',
  'other',
];

const DURATION_UNITS = ['day', 'week', 'month'];

const ROUTES = ['oral', 'topical', 'sublingual', 'intramuscular', 'intravenous', 'other'];

const FOOD_INSTRUCTIONS = ['before-food', 'after-food', 'with-food', 'no-preference'];

const prescriptionItemSchema = new mongoose.Schema(
  {
    // Optional reference to the Medicine master. The clinic-relevant snapshot
    // fields below (name/generic/dosage/…) are always preserved even if the
    // master record is later deactivated.
    medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', default: null },
    medicine: { type: String, required: true, trim: true },
    genericName: { type: String, trim: true, default: '' },
    dosage: { type: String, trim: true, default: '' },
    unit: { type: String, trim: true, default: 'mg' },
    frequency: { type: String, enum: PRESCRIPTION_FREQUENCIES, default: 'twice-daily' },
    customFrequency: { type: String, trim: true, default: '' },
    duration: { type: Number, min: 0, default: null },
    durationUnit: { type: String, enum: DURATION_UNITS, default: 'day' },
    route: { type: String, enum: ROUTES, default: 'oral' },
    quantity: { type: Number, min: 0, default: null },
    foodInstruction: { type: String, enum: FOOD_INSTRUCTIONS, default: 'after-food' },
    instructions: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    dispensedQuantity: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true },
);

const prescriptionSchema = new mongoose.Schema(
  {
    prescriptionNumber: { type: String, unique: true, index: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    visit: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit' },
    consultation: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation', index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    diagnosis: { type: mongoose.Schema.Types.ObjectId, ref: 'Diagnosis' },
    rxDate: { type: Date, default: Date.now },
    status: { type: String, enum: PRESCRIPTION_STATUSES, default: 'draft' },
    issuedAt: { type: Date },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: { type: Date },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelReason: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    isArchived: { type: Boolean, default: false },
    items: [prescriptionItemSchema],
    dispensedAt: { type: Date },
    dispensedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

prescriptionSchema.index({ patient: 1, createdAt: -1 });
prescriptionSchema.index({ consultation: 1, createdAt: -1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);
module.exports.PRESCRIPTION_STATUSES = PRESCRIPTION_STATUSES;
module.exports.PRESCRIPTION_FREQUENCIES = PRESCRIPTION_FREQUENCIES;
module.exports.DURATION_UNITS = DURATION_UNITS;
module.exports.ROUTES = ROUTES;
module.exports.FOOD_INSTRUCTIONS = FOOD_INSTRUCTIONS;