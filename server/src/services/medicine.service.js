// Backward-compatible wrapper around the batch-authoritative inventory service.
// The full inventory logic (batches, stock movements, medicine registry) lives
// in inventory.service.js. This module keeps the original function signatures
// so existing controllers and integration tests keep working.
const Medicine = require('../models/Medicine');
const MedicineBatch = require('../models/MedicineBatch');
const inventory = require('./inventory.service');
const ApiError = require('../utils/ApiError');

const EXPIRING_SOON_DAYS = inventory.EXPIRY_WARNING_DAYS;

const assertAction = (a) => a; // actions validated inside inventory service.

async function sanitizeWithStatus(doc) {
  const batches = await inventory.listBatches({ medicineId: doc._id, includeInactive: true });
  return inventory.sanitizeMedicine(doc, batches);
}

async function list(opts = {}) {
  return inventory.listMedicines({
    q: opts.q,
    category: opts.category,
    lowStock: opts.lowStock,
    outOfStock: opts.outOfStock,
    expiringSoon: opts.expiringSoon,
    expired: opts.expired,
    activeOnly: opts.activeOnly,
  });
}

async function get(id) {
  const doc = await Medicine.findById(id);
  if (!doc) throw new ApiError(404, 'Medicine not found');
  return inventory.getMedicine(id);
}

function create(payload, actor) {
  return inventory.createMedicine(payload, actor);
}

function update(id, payload, actor) {
  return inventory.updateMedicine(id, payload, actor);
}

// Legacy patient-level "+ stock" used by the original inventory screen.
async function addStock(medicineId, payload, actor) {
  const med = await Medicine.findById(medicineId);
  if (!med) throw new ApiError(404, 'Medicine not found');
  const qty = Number(payload && payload.quantity);
  if (!Number.isFinite(qty) || qty <= 0) throw new ApiError(400, 'Quantity must be a positive number.');

  // Find or create a primary batch that carries the existing legacy quantity,
  // so switching a medicine to batch-mode never loses its current stock.
  let batch = await MedicineBatch.findOne({ medicine: medicineId, isActive: true })
    .sort({ expiryDate: 1, createdAt: 1 });
  if (!batch) {
    batch = await inventory.ensureBatch(medicineId, {
      expiryDate: med.expiryDate,
      quantity: med.quantity,
      purchasePrice: med.costPrice,
      sellPrice: med.sellPrice,
      supplier: med.supplier,
    }, actor);
  }
  const updated = await inventory.receiveStock(batch._id, {
    quantity: qty,
    reason: payload.reason || '',
    notes: payload.notes || 'Stock received',
  }, actor);
  return { medicine: await sanitizeWithStatus(med), balanceAfter: updated.currentQuantity };
}

// Legacy patient-level "- stock" use the primary batch.
async function removeStock(medicineId, payload, actor) {
  const med = await Medicine.findById(medicineId);
  if (!med) throw new ApiError(404, 'Medicine not found');
  const qty = Number(payload && payload.quantity);
  if (!Number.isFinite(qty) || qty <= 0) throw new ApiError(400, 'Quantity must be a positive number.');

  let batch = await MedicineBatch.findOne({ medicine: medicineId, isActive: true })
    .sort({ expiryDate: 1, createdAt: 1 });
  if (!batch) {
    batch = await inventory.ensureBatch(medicineId, {
      expiryDate: med.expiryDate,
      quantity: med.quantity,
    }, actor);
  }
  await inventory.adjustStock(batch._id, {
    quantity: qty,
    movementType: 'wastage-out',
    reason: payload.reason || '',
    notes: payload.notes || '',
  }, actor);
  const updated = await MedicineBatch.findById(batch._id);
  return { medicine: await sanitizeWithStatus(med), balanceAfter: updated.currentQuantity };
}

// Legacy stock mutator used by the old pharmacy dispense path.
async function createTransaction(medicineId, { action, quantityChange, refType, refId, notes }, actor) {
  const med = await Medicine.findById(medicineId);
  if (!med) throw new ApiError(404, 'Medicine not found');
  const delta = Number(quantityChange);
  if (!Number.isFinite(delta) || delta === 0) throw new ApiError(400, 'Quantity change must be a non-zero number.');

  let batch = await MedicineBatch.findOne({ medicine: medicineId, isActive: true })
    .sort({ expiryDate: 1, createdAt: 1 });
  if (!batch) {
    batch = await inventory.ensureBatch(medicineId, {
      expiryDate: med.expiryDate,
      quantity: med.quantity,
    }, actor);
  }
  const updated = await inventory.applyBatchDelta(batch._id, delta, {
    actor,
    action: action || (delta > 0 ? 'adjustment-in' : 'adjustment-out'),
    refType,
    refId,
    notes: notes || '',
  });
  const medAfter = await Medicine.findById(medicineId);
  return { medicine: await sanitizeWithStatus(medAfter), balanceAfter: updated.currentQuantity };
}

async function listTransactions({ medicineId, batchId, refType, refId, action, limit } = {}) {
  return inventory.listMovements({ medicineId, batchId, refType, refId, action, limit });
}

module.exports = {
  create,
  list,
  get,
  update,
  addStock,
  removeStock,
  createTransaction,
  listTransactions,
  sanitizeWithStatus,
  EXPIRING_SOON_DAYS,
};