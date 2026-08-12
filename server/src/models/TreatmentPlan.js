const mongoose = require('mongoose');

const PLAN_STATUSES = [
  'draft',
  'proposed',
  'approved',
  'declined',
  'in-progress',
  'partially-completed',
  'completed',
  'cancelled',
];

const PLAN_ITEM_STATUSES = ['planned', 'scheduled', 'in-progress', 'completed', 'deferred', 'cancelled'];

const PLAN_PRIORITIES = ['urgent', 'high', 'medium', 'low'];

const treatmentPlanItemSchema = new mongoose.Schema(
  {
    procedure: { type: String, required: true, trim: true },
    toothNumber: { type: Number, default: 0, min: 0, max: 48 },
    hasTooth: { type: Boolean, default: false },
    description: { type: String, trim: true },
    priority: { type: String, enum: PLAN_PRIORITIES, default: 'medium' },
    estimatedCost: { type: Number, default: 0, min: 0 },
    plannedDate: { type: Date },
    status: { type: String, enum: PLAN_ITEM_STATUSES, default: 'planned' },
    diagnosis: { type: mongoose.Schema.Types.ObjectId, ref: 'Diagnosis' },
    notes: { type: String, trim: true },
    sortOrder: { type: Number, default: 0 },
    _isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const treatmentPlanSchema = new mongoose.Schema(
  {
    planNumber: { type: String, unique: true, index: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    consultation: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation', index: true },
    visit: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit' },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, trim: true },
    status: { type: String, enum: PLAN_STATUSES, default: 'draft' },
    proposedAt: { type: Date },
    approvedAt: { type: Date },
    declinedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    declineReason: { type: String, trim: true },
    notes: { type: String, trim: true },
    isArchived: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    items: [treatmentPlanItemSchema],
  },
  { timestamps: true },
);

treatmentPlanSchema.index({ patient: 1, createdAt: -1 });

module.exports = mongoose.model('TreatmentPlan', treatmentPlanSchema);
module.exports.PLAN_STATUSES = PLAN_STATUSES;
module.exports.PLAN_ITEM_STATUSES = PLAN_ITEM_STATUSES;
module.exports.PLAN_PRIORITIES = PLAN_PRIORITIES;
