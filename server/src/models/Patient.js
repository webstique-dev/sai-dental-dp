const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    patientId: { type: String, unique: true, required: true, index: true },
    title: { type: String },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    dob: { type: Date },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'unknown'],
      default: 'unknown',
    },
    phone: { type: String, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    occupation: { type: String, trim: true },
    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'],
      default: 'unknown',
    },
    permanentAlerts: [String],
    // ── Dental OP Record Fields ──
    manualAge: { type: Number, default: null },
    medicalHistory: {
      diabetesMellitus: { type: Boolean, default: false },
      hypertension: { type: Boolean, default: false },
      asthma: { type: Boolean, default: false },
      allergy: { type: Boolean, default: false },
      pregnancy: { type: Boolean, default: false },
      cardiacDisease: { type: Boolean, default: false },
      epilepsy: { type: Boolean, default: false },
      thyroidDisorder: { type: Boolean, default: false },
      hepatitis: { type: Boolean, default: false },
      bleedingDisorder: { type: Boolean, default: false },
      other: { type: String, default: '' },
    },
    currentMedications: { type: String, trim: true, default: '' },
    vitals: {
      bp: { type: String, default: '' },
      rbs: { type: String, default: '' },
    },
    habits: {
      smoking: { type: Boolean, default: false },
      tobacco: { type: Boolean, default: false },
      alcohol: { type: Boolean, default: false },
      pan: { type: Boolean, default: false },
    },
    dentalHistory: { type: String, trim: true, default: '' },
    // ── End Dental OP Record Fields ──
    isArchived: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, toJSON: { virtuals: true } },
);

patientSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

patientSchema.virtual('age').get(function () {
  if (this.dob) {
    const now = new Date();
    let age = now.getFullYear() - this.dob.getFullYear();
    const m = now.getMonth() - this.dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < this.dob.getDate())) age -= 1;
    return age;
  }
  return this.manualAge || null;
});

patientSchema.index({ firstName: 1, lastName: 1 });
patientSchema.index({ createdAt: -1 });

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient;