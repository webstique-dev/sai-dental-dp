const mongoose = require('mongoose');

// Service catalog entry. This is the PRICE CATALOG, not an invoice.
// unitPrice is stored as a whole-rupee number (rounded to 2 decimals) so that
// float drift is avoided. Invoices snapshot this price at creation time.
const SERVICE_CATEGORIES = ['consultation', 'procedure', 'investigation', 'other'];

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true, index: true },
    category: { type: String, enum: SERVICE_CATEGORIES, default: 'treatment' },
    description: { type: String, trim: true, default: '' },
    unitPrice: { type: Number, required: true, min: 0 },
    taxPercent: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

serviceSchema.index({ isActive: 1, category: 1, name: 1 });

module.exports = mongoose.model('Service', serviceSchema);
module.exports.SERVICE_CATEGORIES = SERVICE_CATEGORIES;