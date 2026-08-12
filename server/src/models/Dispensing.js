const mongoose = require('mongoose');

// A single dispensing event. A prescription may have multiple dispensing
// records over time (partial then complete); records are never overwritten.
// Items reference the prescription line, inventory medicine and the actual
// batch stock was taken from.
const DISPENSING_STATUSES = ['completed', 'cancelled'];

const dispensingItemSchema = new mongoose.Schema(
  {
    prescriptionItem: { type: mongoose.Schema.Types.ObjectId }, // sub-document _id of the prescription line
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true, index: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicineBatch', required: true, index: true },
    medicineName: { type: String, trim: true, default: '' }, // snapshot for history
    dosage: { type: String, trim: true, default: '' },
    unit: { type: String, trim: true, default: 'tablet' },
    quantity: { type: Number, required: true, min: 0 }, // units dispensed now
    remainingAfter: { type: Number, default: 0 }, // remaining on the prescription line after this event
    sellPrice: { type: Number, default: 0 }, // price snapshot at dispensing time
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
);

const dispensingSchema = new mongoose.Schema(
  {
    dispensingNumber: { type: String, unique: true, index: true },
    prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', required: true, index: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    visit: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit', default: null },
    pharmacist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dispensedAt: { type: Date, default: Date.now },
    items: { type: [dispensingItemSchema], default: [] },
    totalQuantity: { type: Number, default: 0 },
    // Optional link to a billing invoice/med bill (future pharmacy billing).
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
    status: { type: String, enum: DISPENSING_STATUSES, default: 'completed' },
    notes: { type: String, trim: true, default: '' },
    cancelledAt: { type: Date },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelReason: { type: String, trim: true, default: '' },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

dispensingSchema.index({ prescription: 1, createdAt: -1 });
dispensingSchema.index({ patient: 1, dispensedAt: -1 });
dispensingSchema.index({ dispensedAt: -1 });
dispensingSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Dispensing', dispensingSchema);
module.exports.DISPENSING_STATUSES = DISPENSING_STATUSES;