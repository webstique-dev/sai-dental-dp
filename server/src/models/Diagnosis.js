const mongoose = require('mongoose');

const DIAGNOSIS_CATEGORIES = ['dental', 'oral', 'systemic', 'other'];
const DIAGNOSIS_STATUSES = ['active', 'resolved', 'ruled-out', 'historical'];

const diagnosisSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    visit: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit' },
    consultation: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation', index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    isCustom: { type: Boolean, default: false },
    category: { type: String, enum: DIAGNOSIS_CATEGORIES, default: 'dental' },
    toothNumber: { type: Number, default: 0, min: 0, max: 48 },
    hasTooth: { type: Boolean, default: false },
    findings: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: { type: String, enum: DIAGNOSIS_STATUSES, default: 'active' },
    date: { type: Date, default: Date.now },
    isArchived: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

diagnosisSchema.index({ patient: 1, date: -1 });
diagnosisSchema.index({ toothNumber: 1 });

module.exports = mongoose.model('Diagnosis', diagnosisSchema);
module.exports.DIAGNOSIS_CATEGORIES = DIAGNOSIS_CATEGORIES;
module.exports.DIAGNOSIS_STATUSES = DIAGNOSIS_STATUSES;
