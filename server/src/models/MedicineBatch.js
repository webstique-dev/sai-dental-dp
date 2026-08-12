const mongoose = require('mongoose');

// A physical stock batch of a medicine. Inventory lives here; the Medicine
// master only aggregates batch stock. Every change to `currentQuantity` must
// be accompanied by an InventoryTransaction (stock movement) through the
// inventory service - never by editing this document directly.
const medicineBatchSchema = new mongoose.Schema(
  {
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true, index: true },
    batchNumber: { type: String, required: true, trim: true, uppercase: true },
    expiryDate: { type: Date, default: null },
    purchaseDate: { type: Date, default: null },
    purchasePrice: { type: Number, min: 0, default: 0 },
    sellPrice: { type: Number, min: 0, default: 0 },
    quantityReceived: { type: Number, min: 0, default: 0 },
    currentQuantity: { type: Number, required: true, min: 0, default: 0 },
    supplier: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

medicineBatchSchema.index({ medicine: 1, batchNumber: 1 }, { unique: true });
medicineBatchSchema.index({ expiryDate: 1 });
medicineBatchSchema.index({ batchNumber: 1 });
medicineBatchSchema.index({ medicine: 1, isActive: 1, expiryDate: 1 });

module.exports = mongoose.model('MedicineBatch', medicineBatchSchema);