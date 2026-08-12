const mongoose = require('mongoose');

const INVESTIGATION_STATUSES = [
  'requested',
  'scheduled',
  'in-progress',
  'completed',
  'result-available',
  'cancelled',
];

const INVESTIGATION_TYPES = ['rvg-iopa', 'opg', 'cbct', 'other'];

const INVESTIGATION_PRIORITIES = ['routine', 'urgent'];

const investigationResultSchema = new mongoose.Schema(
  {
    findings: { type: String, trim: true, default: '' },
    interpretation: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    resultDate: { type: Date },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

const attachmentSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    url: { type: String, trim: true, default: '' },
    storageKey: { type: String, trim: true, default: '' },
    mimeType: { type: String, trim: true, default: '' },
    size: { type: Number, default: 0 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

const investigationSchema = new mongoose.Schema(
  {
    investigationNumber: { type: String, unique: true, index: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    visit: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit' },
    consultation: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation', index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    diagnosis: { type: mongoose.Schema.Types.ObjectId, ref: 'Diagnosis' },
    treatmentPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'TreatmentPlan' },
    type: { type: String, enum: INVESTIGATION_TYPES, default: 'opg' },
    customType: { type: String, trim: true, default: '' },
    reason: { type: String, trim: true, default: '' },
    indication: { type: String, trim: true, default: '' },
    priority: { type: String, enum: INVESTIGATION_PRIORITIES, default: 'routine' },
    requestedDate: { type: Date, default: Date.now },
    status: { type: String, enum: INVESTIGATION_STATUSES, default: 'requested' },
    notes: { type: String, trim: true, default: '' },
    completedAt: { type: Date },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    result: investigationResultSchema,
    // Append-only result history — preserves corrected/previous results.
    resultHistory: [investigationResultSchema],
    attachments: [attachmentSchema],
    isArchived: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

investigationSchema.index({ patient: 1, createdAt: -1 });
investigationSchema.index({ consultation: 1, createdAt: -1 });

module.exports = mongoose.model('Investigation', investigationSchema);
module.exports.INVESTIGATION_STATUSES = INVESTIGATION_STATUSES;
module.exports.INVESTIGATION_TYPES = INVESTIGATION_TYPES;
module.exports.INVESTIGATION_PRIORITIES = INVESTIGATION_PRIORITIES;