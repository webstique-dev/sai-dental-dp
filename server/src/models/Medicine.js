const mongoose = require('mongoose');

// Medicine master / catalog. Acts as the single catalogue record for a drug.
// Stock is NOT authoritative here: it lives on MedicineBatch documents and the
// `quantity` field below is a denormalised cache equal to the sum of current
// stock across active, non-expired batches. It is never edited directly — it is
// recomputed through the inventory service after every stock movement so the
// batch ledger stays the single source of truth.
const MEDICINE_CATEGORIES = [
  'antibiotic',
  'analgesic',
  'anti-inflammatory',
  'mouthwash',
  'anesthetic',
  'steroidal',
  'supplement',
  'other',
];

// Reusable dosage-form options shared by the UI and API (not hardcoded into
// individual components).
const DOSAGE_FORMS = [
  'tablet',
  'capsule',
  'syrup',
  'suspension',
  'cream',
  'gel',
  'ointment',
  'mouthwash',
  'drops',
  'injection',
  'other',
];

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    genericName: { type: String, trim: true, default: '', index: true },
    brandName: { type: String, trim: true, default: '' },
    category: { type: String, enum: MEDICINE_CATEGORIES, default: 'other', index: true },
    strength: { type: String, trim: true, default: '' },
    dosageForm: { type: String, enum: DOSAGE_FORMS, default: 'tablet' },
    unit: { type: String, trim: true, default: 'tablet' },
    manufacturer: { type: String, trim: true, default: '' },
    sku: { type: String, trim: true, default: '', index: true },
    barcode: { type: String, trim: true, default: '', index: true },
    description: { type: String, trim: true, default: '' },
    // --- legacy single-batch fields (kept for backward compatibility). New
    // stock is entered through MedicineBatch records; these are informational.
    batchNumber: { type: String, trim: true, default: '' },
    expiryDate: { type: Date, default: null },
    // Denormalised available stock cache: recomputed from batches by the
    // inventory service. Never edited manually.
    quantity: { type: Number, required: true, min: 0, default: 0, index: true },
    reorderLevel: { type: Number, min: 0, default: 10 },
    costPrice: { type: Number, min: 0, default: 0 },
    sellPrice: { type: Number, min: 0, default: 0 },
    supplier: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

medicineSchema.index({ isActive: 1, name: 1 });
medicineSchema.index({ category: 1, name: 1 });
medicineSchema.index({ genericName: 1, name: 1 });

module.exports = mongoose.model('Medicine', medicineSchema);
module.exports.MEDICINE_CATEGORIES = MEDICINE_CATEGORIES;
module.exports.DOSAGE_FORMS = DOSAGE_FORMS;