const mongoose = require('mongoose');

// Medicine return request. Stock is NOT restored automatically: a return starts
// as "pending" (only recorded), and stock is only put back after an authorized
// user confirms it. Once confirmed, a "returned" stock movement is created.
const RETURN_STATUSES = ['pending', 'confirmed', 'cancelled'];

const stockReturnSchema = new mongoose.Schema(
  {
    returnNumber: { type: String, unique: true, index: true },
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true, index: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicineBatch', required: true },
    dispensing: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispensing', default: null },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', default: null },
    quantity: { type: Number, required: true, min: 1 },
    canRestock: { type: Boolean, default: true }, // whether the medicine may safely return to available stock
    reason: { type: String, trim: true, default: '' },
    status: { type: String, enum: RETURN_STATUSES, default: 'pending' },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    confirmedAt: { type: Date },
  },
  { timestamps: true },
);

stockReturnSchema.index({ status: 1, createdAt: -1 });
stockReturnSchema.index({ medicine: 1, createdAt: -1 });

module.exports = mongoose.model('StockReturn', stockReturnSchema);
module.exports.RETURN_STATUSES = RETURN_STATUSES;