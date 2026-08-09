const mongoose = require('mongoose');

// FDI permanent tooth numbers (quadrants 1-4).
const VALID_TOOTH_NUMBERS = [
  11, 12, 13, 14, 15, 16, 17, 18,
  21, 22, 23, 24, 25, 26, 27, 28,
  31, 32, 33, 34, 35, 36, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48,
];
const TOOTH_NUMBER_SET = new Set(VALID_TOOTH_NUMBERS);

// Clinical codes from the physical dental record (D/M/F/RCT/Cr/Br/I).
const TOOTH_CONDITIONS = [
  'healthy',
  'caries',            // D
  'missing',           // M
  'filling',           // F
  'rct',               // RCT
  'crown',             // Cr
  'bridge',            // Br
  'implant',           // I
  'extraction-required',
  'other',
];

const TOOTH_CONDITION_LABELS = {
  healthy: 'Healthy',
  caries: 'Caries (D)',
  missing: 'Missing (M)',
  filling: 'Filling (F)',
  rct: 'Root Canal Treatment (RCT)',
  crown: 'Crown (Cr)',
  bridge: 'Bridge (Br)',
  implant: 'Implant (I)',
  'extraction-required': 'Extraction Required',
  other: 'Other',
};

// Short clinical codes shown alongside the readable label.
const TOOTH_CONDITION_CODES = {
  healthy: '',
  caries: 'D',
  missing: 'M',
  filling: 'F',
  rct: 'RCT',
  crown: 'Cr',
  bridge: 'Br',
  implant: 'I',
  'extraction-required': 'Ex',
  other: 'Oth',
};

const TOOTH_TREATMENT_STATUSES = [
  'planned',
  'started',
  'in-progress',
  'completed',
  'cancelled',
];

const TOOTH_TREATMENT_STATUS_LABELS = {
  planned: 'Planned',
  started: 'Started',
  'in-progress': 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const toothFindingSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    condition: { type: String, enum: TOOTH_CONDITIONS, required: true },
    findings: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    visit: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit', default: null },
    consultation: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation', default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const toothTreatmentSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    procedure: { type: String, trim: true, required: true },
    status: { type: String, enum: TOOTH_TREATMENT_STATUSES, default: 'planned' },
    charges: { type: Number, default: 0, min: 0 },
    notes: { type: String, trim: true, default: '' },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    visit: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit', default: null },
    consultation: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation', default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const patientToothSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    toothNumber: { type: Number, required: true },
    currentStatus: {
      type: String,
      enum: TOOTH_CONDITIONS,
      default: 'healthy',
    },
    isMissing: { type: Boolean, default: false },
    notes: { type: String, trim: true, default: '' },
    findings: { type: [toothFindingSchema], default: [] },
    treatments: { type: [toothTreatmentSchema], default: [] },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// One tooth record per patient; teeth are created lazily on first activity.
patientToothSchema.index({ patient: 1, toothNumber: 1 }, { unique: true });
patientToothSchema.index({ patient: 1, currentStatus: 1 });

const PatientTooth = mongoose.model('PatientTooth', patientToothSchema);

module.exports = {
  PatientTooth,
  VALID_TOOTH_NUMBERS,
  TOOTH_NUMBER_SET,
  TOOTH_CONDITIONS,
  TOOTH_CONDITION_LABELS,
  TOOTH_CONDITION_CODES,
  TOOTH_TREATMENT_STATUSES,
  TOOTH_TREATMENT_STATUS_LABELS,
};