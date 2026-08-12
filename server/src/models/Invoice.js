const mongoose = require('mongoose');

const INVOICE_STATUSES = ['draft', 'finalized', 'cancelled'];
const INVOICE_PAYMENT_STATUSES = ['unpaid', 'partially-paid', 'paid', 'refunded'];
const DISCOUNT_TYPES = ['none', 'fixed', 'percent'];

const invoiceItemSchema = new mongoose.Schema(
  {
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    treatmentRecord: { type: mongoose.Schema.Types.ObjectId, ref: 'TreatmentRecord' },
    investigation: { type: mongoose.Schema.Types.ObjectId, ref: 'Investigation' },
    toothNumber: { type: Number, min: 0, max: 48, default: 0 },
    hasTooth: { type: Boolean, default: false },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    category: { type: String, trim: true, default: 'procedure' },
    qty: { type: Number, default: 1, min: 1 },
    unitPricePaise: { type: Number, default: 0, min: 0 }, // price snapshot in paise
    taxPercent: { type: Number, default: 0, min: 0 },
    sortOrder: { type: Number, default: 0 },
    _isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true, index: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    visit: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit' },
    consultation: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation' },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    billDate: { type: Date, default: Date.now },
    status: { type: String, enum: INVOICE_STATUSES, default: 'draft' },
    paymentStatus: { type: String, enum: INVOICE_PAYMENT_STATUSES, default: 'unpaid' },
    items: { type: [invoiceItemSchema], default: [] },
    discountType: { type: String, enum: DISCOUNT_TYPES, default: 'none' },
    discountValue: { type: Number, default: 0, min: 0 }, // rupees or percent depending on type
    taxPercent: { type: Number, default: 0, min: 0 },
    // Computed totals, always stored in paise (integer).
    subtotalPaise: { type: Number, default: 0 },
    discountPaise: { type: Number, default: 0 },
    taxPaise: { type: Number, default: 0 },
    totalPaise: { type: Number, default: 0 },
    amountPaidPaise: { type: Number, default: 0, min: 0 },
    balancePaise: { type: Number, default: 0, min: 0 },
    notes: { type: String, trim: true, default: '' },
    finalizedAt: { type: Date },
    finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: { type: Date },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelReason: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isArchived: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

invoiceSchema.index({ patient: 1, billDate: -1 });
invoiceSchema.index({ status: 1, billDate: -1 });
invoiceSchema.index({ visit: 1, billDate: -1 });
invoiceSchema.index({ consultation: 1, createdAt: -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
module.exports.INVOICE_STATUSES = INVOICE_STATUSES;
module.exports.INVOICE_PAYMENT_STATUSES = INVOICE_PAYMENT_STATUSES;
module.exports.DISCOUNT_TYPES = DISCOUNT_TYPES;