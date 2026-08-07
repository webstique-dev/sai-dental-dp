const mongoose = require('mongoose');

const CONSULTATION_STATUSES = ['draft', 'in-progress', 'completed', 'cancelled'];
const ASSESSMENT = ['normal', 'abnormal', 'not-examined'];
const ANSWER = ['yes', 'no', 'unknown'];

const MEDICAL_CONDITIONS = [
  'Diabetes Mellitus',
  'Hypertension',
  'Asthma',
  'Allergy',
  'Pregnancy',
  'Cardiac Disease',
  'Epilepsy',
  'Thyroid Disorder',
  'Hepatitis',
  'Bleeding Disorder',
  'Other',
];

const GINGIVAL_FINDINGS = [
  'Healthy',
  'Gingivitis',
  'Periodontitis',
  'Enlargement',
  'Recession',
  'Bleeding on Probing',
];

const HABIT_NAMES = ['smoking', 'tobacco', 'alcohol', 'pan'];

const conditionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    answer: { type: String, enum: ANSWER, default: 'unknown' },
    notes: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const medicationSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    dosage: { type: String, trim: true, default: '' },
    frequency: { type: String, trim: true, default: '' },
    route: { type: String, trim: true, default: '' },
    duration: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const habitSchema = new mongoose.Schema(
  {
    present: { type: Boolean, default: false },
    frequency: { type: String, trim: true, default: '' },
    duration: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const assessmentSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ASSESSMENT, default: 'not-examined' },
    notes: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const consultationSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: CONSULTATION_STATUSES,
      default: 'draft',
      index: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    visit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Visit',
      required: true,
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    visitDate: { type: Date, default: Date.now },

    medicalHistory: {
      conditions: {
        type: [conditionSchema],
        default: () => MEDICAL_CONDITIONS.map((name) => ({ name })),
      },
      takingMedication: { type: String, enum: ANSWER, default: 'unknown' },
      medications: { type: [medicationSchema], default: [] },
      notes: { type: String, trim: true, default: '' },
    },

    vitals: {
      systolic: { type: String, trim: true, default: '' },
      diastolic: { type: String, trim: true, default: '' },
      rbs: { type: String, trim: true, default: '' },
      rbsUnit: { type: String, trim: true, default: 'mg/dL' },
      notes: { type: String, trim: true, default: '' },
    },

habits: {
      smoking: { type: habitSchema, default: () => ({}) },
      tobacco: { type: habitSchema, default: () => ({}) },
      alcohol: { type: habitSchema, default: () => ({}) },
      pan: { type: habitSchema, default: () => ({}) },
    },

    dentalHistory: {
      previousTreatments: { type: String, trim: true, default: '' },
      previousProblems: { type: String, trim: true, default: '' },
      previousExtractions: { type: String, trim: true, default: '' },
      previousRootCanal: { type: String, trim: true, default: '' },
      previousCrownsBridgesImplants: { type: String, trim: true, default: '' },
      orthodonticTreatment: { type: String, trim: true, default: '' },
      lastDentalVisit: { type: String, trim: true, default: '' },
      clinicalNotes: { type: String, trim: true, default: '' },
    },

    extraoralExamination: {
      facialSymmetry: { type: assessmentSchema, default: () => ({}) },
      tmj: { type: assessmentSchema, default: () => ({}) },
      lymphNodes: { type: assessmentSchema, default: () => ({}) },
      swelling: { type: assessmentSchema, default: () => ({}) },
      notes: { type: String, trim: true, default: '' },
    },

    intraoralExamination: {
      labialBuccalMucosa: { type: assessmentSchema, default: () => ({}) },
      tongue: { type: assessmentSchema, default: () => ({}) },
      floorOfMouth: { type: assessmentSchema, default: () => ({}) },
      gingiva: { type: assessmentSchema, default: () => ({}) },
      hardPalate: { type: assessmentSchema, default: () => ({}) },
      softPalate: { type: assessmentSchema, default: () => ({}) },
      notes: { type: String, trim: true, default: '' },
    },

    gingivalFindings: {
      findings: {
        type: [String],
        enum: GINGIVAL_FINDINGS,
        default: [],
      },
      notes: { type: String, trim: true, default: '' },
    },

    hardTissueExamination: {
      summary: { type: String, trim: true, default: '' },
      notes: { type: String, trim: true, default: '' },
    },

    clinicalFindings: { type: String, trim: true, default: '' },

    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    completedAt: { type: Date, default: null },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

consultationSchema.index({ patient: 1, visitDate: -1 });
consultationSchema.index({ visit: 1 }, { unique: true });
consultationSchema.index({ doctor: 1, status: 1 });

consultationSchema.methods.toSummary = function () {
  return {
    id: this._id,
    status: this.status,
    patient: this.patient,
    visit: this.visit,
    appointment: this.appointment,
    doctor: this.doctor,
    visitDate: this.visitDate,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    completedAt: this.completedAt,
  };
};

const Consultation = mongoose.model('Consultation', consultationSchema);

module.exports = {
  Consultation,
  CONSULTATION_STATUSES,
  MEDICAL_CONDITIONS,
  GINGIVAL_FINDINGS,
  HABIT_NAMES,
};