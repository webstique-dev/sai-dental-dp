const mongoose = require('mongoose');

// Treatment Record = what the dentist ACTUALLY did (vs Treatment Plan = intent).
const TREATMENT_RECORD_STATUSES = [
  'planned',
  'in-progress',
  'partially-completed',
  'completed',
  'cancelled',
  'deferred',
];

const TREATMENT_OUTCOMES = [
  'successful',
  'partially-completed',
  'requires-further-treatment',
  'referred',
  'other',
];

const materialSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    quantity: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
  },
  { _id: true },
);

const anesthesiaSchema = new mongoose.Schema(
  {
    used: { type: Boolean, default: false },
    type: { type: String, trim: true, default: '' },
    amount: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const treatmentRecordSchema = new mongoose.Schema(
  {
    recordNumber: { type: String, unique: true, index: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    visit: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit' },
    consultation: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation', index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    treatmentPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'TreatmentPlan' },
    treatmentPlanItem: { type: mongoose.Schema.Types.ObjectId },
    diagnosis: { type: mongoose.Schema.Types.ObjectId, ref: 'Diagnosis' },
    toothNumber: { type: Number, min: 0, max: 48, default: 0 },
    hasTooth: { type: Boolean, default: false },
    procedure: { type: String, trim: true, required: true },
    procedureDate: { type: Date, default: Date.now },
    startTime: { type: String, trim: true, default: '' },
    endTime: { type: String, trim: true, default: '' },
    findings: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    materials: { type: [materialSchema], default: [] },
    anesthesia: { type: anesthesiaSchema, default: () => ({ used: false, type: '', amount: '', notes: '' }) },
    complications: { type: String, trim: true, default: '' },
    outcome: { type: String, enum: TREATMENT_OUTCOMES, default: 'successful' },
    outcomeNotes: { type: String, trim: true, default: '' },
    status: { type: String, enum: TREATMENT_RECORD_STATUSES, default: 'in-progress' },
    followUpRecommended: { type: Boolean, default: false },
    followUpDays: { type: Number, min: 0, default: null },
    startedAt: { type: Date },
    startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedAt: { type: Date },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: { type: Date },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelReason: { type: String, trim: true, default: '' },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

treatmentRecordSchema.index({ patient: 1, procedureDate: -1 });
treatmentRecordSchema.index({ consultation: 1, createdAt: -1 });
treatmentRecordSchema.index({ treatmentPlan: 1, createdAt: -1 });
treatmentRecordSchema.index({ toothNumber: 1, patient: 1 });

module.exports = mongoose.model('TreatmentRecord', treatmentRecordSchema);
module.exports.TREATMENT_RECORD_STATUSES = TREATMENT_RECORD_STATUSES;
module.exports.TREATMENT_OUTCOMES = TREATMENT_OUTCOMES;
