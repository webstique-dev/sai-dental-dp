const mongoose = require('mongoose');

// Immutable, append-only ledger of every stock movement (Stock Movement).
// Stock on MedicineBatch/Medicine is only ever mutated through the inventory
// service which writes one of these records per change, so the full audit trail
// is always reconstructable from history.
//
// Movement types (spec section 6):
//   opening        - initial stock placed when a batch is created
//   purchase       - stock received from a supplier
//   adjustment-in  - manual correction that increases stock
//   adjustment-out - manual correction that decreases stock
//   dispense       - issued against a prescription / dispensing record
//   returned       - medicine returned to a batch (after confirmation)
//   expired        - expired stock removed
//   damaged        - damaged/lost stock removed
//
// Legacy aliases (purchase-in / return-in / wastage-out / adjustment) are kept
// so existing records and endpoints keep working.
const INVENTORY_ACTIONS = [
  'opening',
  'purchase',
  'adjustment-in',
  'adjustment-out',
  'dispense',
  'returned',
  'expired',
  'damaged',
  // --- legacy aliases ---
  'purchase-in',
  'return-in',
  'wastage-out',
  'adjustment',
];

const inventoryTransactionSchema = new mongoose.Schema(
  {
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true, index: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicineBatch', default: null, index: true },
    action: { type: String, enum: INVENTORY_ACTIONS, required: true, index: true },
    // signed integer: positive = units gained, negative = units lost.
    quantityChange: { type: Number, required: true },
    // Batch-level balance context (authoritative). Falls back to medicine-level
    // balance for legacy records created before batches were introduced.
    previousQuantity: { type: Number, default: 0 },
    newQuantity: { type: Number, default: 0 },
    balanceAfter: { type: Number, default: 0 },
    // Link back to the source document when applicable.
    refType: { type: String, enum: ['prescription', 'dispensing', 'patient', 'batch', 'return', null], default: null },
    refId: { type: mongoose.Schema.Types.ObjectId },
    reason: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

inventoryTransactionSchema.index({ medicine: 1, createdAt: -1 });
inventoryTransactionSchema.index({ batch: 1, createdAt: -1 });
inventoryTransactionSchema.index({ refType: 1, refId: 1 });
inventoryTransactionSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
module.exports.INVENTORY_ACTIONS = INVENTORY_ACTIONS;