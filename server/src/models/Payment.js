const mongoose = require('mongoose');

const PAYMENT_METHODS = ['cash', 'upi', 'card', 'bank-transfer', 'other'];
const PAYMENT_TYPES = ['payment', 'refund'];

const paymentSchema = new mongoose.Schema(
  {
    paymentNumber: { type: String, unique: true, index: true }, // used as receipt/reference number
    type: { type: String, enum: PAYMENT_TYPES, default: 'payment' },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    visit: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit' },
    amountPaise: { type: Number, required: true, min: 0 },
    method: { type: String, enum: PAYMENT_METHODS, default: 'cash' },
    reference: { type: String, trim: true, default: '' }, // safe reference only (UPI txn id etc). Never stores secrets.
    paymentDate: { type: Date, default: Date.now },
    notes: { type: String, trim: true, default: '' },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isArchived: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

paymentSchema.index({ invoice: 1, createdAt: -1 });
paymentSchema.index({ patient: 1, paymentDate: -1 });
paymentSchema.index({ invoice: 1, type: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
module.exports.PAYMENT_TYPES = PAYMENT_TYPES;