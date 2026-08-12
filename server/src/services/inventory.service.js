const mongoose = require('mongoose');
const Medicine = require('../models/Medicine');
const MedicineBatch = require('../models/MedicineBatch');
const InventoryTransaction = require('../models/InventoryTransaction');
const StockReturn = require('../models/StockReturn');
const { recordAudit } = require('../utils/audit');
const { nextReturnNumber } = require('../models/Counter');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

const EXPIRY_WARNING_DAYS = env.EXPIRY_WARNING_DAYS || 60;

// ---------------------------------------------------------------------------
// Date / status helpers
// ---------------------------------------------------------------------------

function startOfDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isExpiredDate(date) {
  if (!date) return false;
  const today = startOfDay();
  const exp = new Date(date);
  exp.setHours(23, 59, 59, 999);
  return exp < today;
}

function isExpiringSoonDate(date) {
  if (!date) return false;
  const today = startOfDay();
  const exp = new Date(date);
  exp.setHours(23, 59, 59, 999);
  if (exp < today) return false;
  const soon = new Date(today);
  soon.setDate(soon.getDate() + EXPIRY_WARNING_DAYS);
  return exp <= soon;
}

function daysUntil(date) {
  if (!date) return null;
  const today = startOfDay();
  return Math.ceil((new Date(date) - today) / 86400000);
}

function toMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Sanitize batch
// ---------------------------------------------------------------------------

function sanitizeBatch(doc) {
  const d = doc && doc.toObject ? doc.toObject() : doc;
  if (!d) return null;
  let status = 'normal';
  let expired = false;
  let expiringSoon = false;
  if (isExpiredDate(d.expiryDate)) {
    status = 'expired';
    expired = true;
  } else if (isExpiringSoonDate(d.expiryDate)) {
    status = 'expiring-soon';
    expiringSoon = true;
  }
  return {
    id: d._id,
    medicine: d.medicine,
    batchNumber: d.batchNumber || '',
    expiryDate: d.expiryDate || null,
    purchaseDate: d.purchaseDate || null,
    purchasePrice: d.purchasePrice || 0,
    sellPrice: d.sellPrice || 0,
    quantityReceived: d.quantityReceived || 0,
    currentQuantity: d.currentQuantity || 0,
    supplier: d.supplier || '',
    location: d.location || '',
    isActive: d.isActive,
    status,
    expired,
    expiringSoon,
    daysUntilExpiry: d.expiryDate ? daysUntil(d.expiryDate) : null,
    outOfStock: (d.currentQuantity || 0) <= 0,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// SanitizeMedicine — aggregates batch stock into a medicine summary.
// ---------------------------------------------------------------------------

function sanitizeMedicine(doc, batchList) {
  const d = doc && doc.toObject ? doc.toObject() : doc;
  if (!d) return null;
  const batches = (batchList || [])
    .map(sanitizeBatch)
    .filter(Boolean);
  const activeBatches = batches.filter((b) => b.isActive && !b.expired);
  const available = activeBatches.reduce((sum, b) => sum + (b.currentQuantity || 0), 0);
  const totalStock = batches.reduce((sum, b) => sum + (b.currentQuantity || 0), 0);
  const anyExpired = batches.some((b) => b.expired);
  const allBatchesExpired = batches.length > 0 && batches.every((b) => b.expired);
  const earliestExpiry =
    activeBatches
      .map((b) => b.expiryDate)
      .filter(Boolean)
      .sort((a, b2) => new Date(a) - new Date(b2))[0] || null;

  const isLow = available > 0 && available <= d.reorderLevel;
  const expSoon = earliestExpiry ? isExpiringSoonDate(earliestExpiry) : false;

  const statusLabels = [];
  if (available <= 0) statusLabels.push(allBatchesExpired ? 'All expired' : 'Out of stock');
  else if (isLow) statusLabels.push('Low stock');
  if (anyExpired) statusLabels.push('Expired');
  if (expSoon) statusLabels.push('Expiring soon');

  return {
    id: d._id,
    name: d.name,
    genericName: d.genericName || '',
    brandName: d.brandName || '',
    category: d.category,
    dosageForm: d.dosageForm,
    unit: d.unit || 'tablet',
    strength: d.strength || '',
    manufacturer: d.manufacturer || '',
    sku: d.sku || '',
    barcode: d.barcode || '',
    description: d.description || '',
    batchNumber: d.batchNumber || '',
    expiryDate: d.expiryDate || earliestExpiry,
    quantity: available,
    totalStock,
    reorderLevel: d.reorderLevel,
    costPrice: d.costPrice,
    sellPrice: d.sellPrice,
    supplier: d.supplier || '',
    isActive: d.isActive,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    batches,
    batchCount: batches.length,
    available,
    outOfStock: available <= 0,
    lowStock: isLow,
    expired: anyExpired,
    allExpired: allBatchesExpired,
    expiringSoon: expSoon,
    earliestExpiry,
    statusLabels,
  };
}

function stockAlertLabels(med) {
  const labels = [];
  if (med.outOfStock) labels.push('Out of stock');
  if (med.lowStock) labels.push('Low stock');
  if (med.expiringSoon) labels.push('Expiring soon');
  if (med.expired) labels.push('Expired');
  return labels;
}

// ---------------------------------------------------------------------------
// Batch stock mutators (single source of truth)
// ---------------------------------------------------------------------------

// Atomic, guarded stock adjustment on a batch. Returns the updated batch doc.
// currentQuantity can never go below 0.
async function applyBatchDelta(batchId, delta, opts = {}) {
  const { actor, action, refType, refId, reason, notes } = opts;
  const doc = await MedicineBatch.findOneAndUpdate(
    { _id: batchId, isActive: true, currentQuantity: { $gte: -delta } },
    { $inc: { currentQuantity: delta } },
    { new: true },
  );
  if (!doc) {
    const existing = await MedicineBatch.findById(batchId);
    if (!existing) throw new ApiError(404, 'Batch not found');
    if (!existing.isActive) throw new ApiError(409, 'Batch is not active.');
    throw new ApiError(409, `Insufficient stock in batch "${existing.batchNumber}". Available: ${existing.currentQuantity}.`);
  }
  const mvAction = action || (delta > 0 ? 'adjustment-in' : 'adjustment-out');
  const mv = await InventoryTransaction.create({
    medicine: doc.medicine,
    batch: doc._id,
    action: mvAction,
    quantityChange: delta,
    previousQuantity: doc.currentQuantity - delta,
    newQuantity: doc.currentQuantity,
    balanceAfter: doc.currentQuantity,
    refType: refType || null,
    refId: refId || undefined,
    reason: reason || '',
    notes: notes || '',
    performedBy: actor ? actor._id : undefined,
  });
  if (actor) {
    await recordAudit({
      user: actor,
      action: mapAuditAction(mvAction),
      entity: 'inventory-transaction',
      entityId: mv._id,
      description: `${mvAction} ${Math.abs(delta)} of batch "${doc.batchNumber}" (batch balance ${doc.currentQuantity})`,
      meta: { medicine: doc.medicine, batch: doc.batchNumber, delta, balanceAfter: doc.currentQuantity },
    });
  }
  await reconcileMedicineStock(doc.medicine);
  return doc;
}

function mapAuditAction(action) {
  if (action === 'purchase' || action === 'purchase-in') return 'receive';
  if (action === 'expired') return 'expire';
  if (action === 'damaged' || action === 'wastage-out' || action === 'adjustment-in' || action === 'adjustment-out' || action === 'adjustment') return 'adjust';
  if (action === 'returned' || action === 'return-in') return 'return';
  return 'other';
}

// Recompute the Medicine.quantity cache as the sum of active non-expired batch
// stock. If a medicine has no batch records, the stored quantity is the legacy
// available figure and is left untouched.
async function reconcileMedicineStock(medicineId) {
  const agg = await MedicineBatch.aggregate([
    { $match: { medicine: medicineId, isActive: true } },
    {
      $group: {
        _id: null,
        anyBatch: { $sum: 1 },
        available: {
          $sum: {
            $cond: [
              { $or: [{ $eq: ['$expiryDate', null] }, { $gte: ['$expiryDate', startOfDay()] }] },
              { $ifNull: ['$currentQuantity', 0] },
              0,
            ],
          },
        },
      },
    },
  ]);
  const row = agg[0];
  if (row && row.anyBatch > 0) {
    await Medicine.updateOne({ _id: medicineId }, { $set: { quantity: row.available } });
  }
  return row && row.anyBatch > 0 ? row.available : undefined;
}

// Ensure a medicine has at least one active batch. Used when dispensing or
// moving stock on a medicine that has never had a batch.
async function ensureBatch(medicineId, data = {}, actor) {
  const existing = await MedicineBatch.findOne({ medicine: medicineId, isActive: true })
    .sort({ expiryDate: 1, createdAt: 1 })
    .lean();
  if (existing) return existing;

  const med = await Medicine.findById(medicineId);
  if (!med) throw new ApiError(404, 'Medicine not found');

  const batchNumber = String(data.batchNumber || `AUTO-${Date.now().toString(36).toUpperCase()}`).trim();
  const qty = Number(data.quantity);
  const openingStock = Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 0;
  const purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : new Date();
  let expiryDate = data.expiryDate ? new Date(data.expiryDate) : med.expiryDate || null;

  const batch = await MedicineBatch.create({
    medicine: medicineId,
    batchNumber,
    expiryDate,
    purchaseDate,
    purchasePrice: toMoney(data.purchasePrice ?? med.costPrice),
    sellPrice: toMoney(data.sellPrice ?? med.sellPrice),
    quantityReceived: openingStock,
    currentQuantity: openingStock,
    supplier: data.supplier || med.supplier || '',
    location: data.location || '',
    createdBy: actor ? actor._id : undefined,
  });

  if (openingStock > 0) {
    await InventoryTransaction.create({
      medicine: medicineId,
      batch: batch._id,
      action: 'opening',
      quantityChange: openingStock,
      previousQuantity: 0,
      newQuantity: openingStock,
      balanceAfter: openingStock,
      notes: 'Opening stock (auto batch)',
      performedBy: actor ? actor._id : undefined,
    });
  }
  await reconcileMedicineStock(medicineId);
  return batch;
}

// ---------------------------------------------------------------------------
// Higher-level batch operations
// ---------------------------------------------------------------------------

async function createBatch(medicineId, payload, actor) {
  const med = await Medicine.findById(medicineId);
  if (!med) throw new ApiError(404, 'Medicine not found');
  if (!payload || !String(payload.batchNumber || '').trim()) {
    throw new ApiError(400, 'Batch number is required.');
  }
  const batchNumber = String(payload.batchNumber).trim().toUpperCase();
  const existing = await MedicineBatch.findOne({ medicine: medicineId, batchNumber });
  if (existing) throw new ApiError(409, `Batch "${batchNumber}" already exists for this medicine.`);

  let expiryDate = null;
  if (payload.expiryDate) {
    const d = new Date(payload.expiryDate);
    if (Number.isNaN(d.getTime())) throw new ApiError(400, 'Invalid expiry date.');
    expiryDate = d;
  }
  let purchaseDate = payload.purchaseDate ? new Date(payload.purchaseDate) : new Date();
  const qty = Number(payload.quantity) || 0;
  if (!Number.isFinite(qty) || qty < 0) throw new ApiError(400, 'Quantity must be a non-negative number.');

  const doc = await MedicineBatch.create({
    medicine: med._id,
    batchNumber,
    expiryDate,
    purchaseDate,
    purchasePrice: toMoney(payload.purchasePrice),
    sellPrice: toMoney(payload.sellPrice),
    quantityReceived: qty,
    currentQuantity: qty,
    supplier: payload.supplier || '',
    location: payload.location || '',
    isActive: payload.isActive === false ? false : true,
    createdBy: actor._id,
  });

  if (qty > 0) {
    await InventoryTransaction.create({
      medicine: med._id,
      batch: doc._id,
      action: 'purchase',
      quantityChange: qty,
      previousQuantity: 0,
      newQuantity: qty,
      balanceAfter: qty,
      refType: 'batch',
      refId: doc._id,
      reason: payload.reason || '',
      notes: payload.notes || 'Stock received',
      performedBy: actor._id,
    });
    await recordAudit({
      user: actor,
      action: 'receive',
      entity: 'medicine-batch',
      entityId: doc._id,
      description: `Batch ${batchNumber} created for "${med.name}" (${qty} units)`,
      meta: { medicine: med.name, quantity: qty },
    });
  }
  await reconcileMedicineStock(med._id);
  return sanitizeBatch(await MedicineBatch.findById(doc._id));
}

async function listBatches({ medicineId, q, status, includeInactive } = {}) {
  const query = { isDeleted: { $ne: true } };
  if (medicineId) query.medicine = medicineId;
  if (!includeInactive) query.isActive = true;
  if (q) {
    const rx = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ batchNumber: rx }, { supplier: rx }, { location: rx }];
  }
  const docs = await MedicineBatch.find(query)
    .sort({ expiryDate: 1, createdAt: 1 })
    .populate('medicine', 'name genericName category');
  let out = docs.map(sanitizeBatch).filter(Boolean);
  if (status) {
    if (status === 'in-stock') out = out.filter((b) => !b.outOfStock);
    else out = out.filter((b) => b.status === status);
  }
  return out;
}

async function getBatch(id) {
  const doc = await MedicineBatch.findOne({ _id: id, isDeleted: { $ne: true } }).populate('medicine', 'name genericName category');
  if (!doc) throw new ApiError(404, 'Batch not found');
  return sanitizeBatch(doc);
}

async function updateBatch(id, payload, actor) {
  const doc = await MedicineBatch.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new ApiError(404, 'Batch not found');
  if (payload.batchNumber !== undefined) {
    const bn = String(payload.batchNumber).trim().toUpperCase();
    if (!bn) throw new ApiError(400, 'Batch number is required.');
    const dup = await MedicineBatch.findOne({ medicine: doc.medicine, batchNumber: bn, _id: { $ne: doc._id }, isDeleted: { $ne: true } });
    if (dup) throw new ApiError(409, `Batch "${bn}" already exists for this medicine.`);
    doc.batchNumber = bn;
  }
  if (payload.expiryDate !== undefined) {
    if (!payload.expiryDate) doc.expiryDate = null;
    else {
      const d = new Date(payload.expiryDate);
      if (Number.isNaN(d.getTime())) throw new ApiError(400, 'Invalid expiry date.');
      doc.expiryDate = d;
    }
  }
  if (payload.purchaseDate !== undefined && payload.purchaseDate) doc.purchaseDate = new Date(payload.purchaseDate);
  if (payload.purchasePrice !== undefined) doc.purchasePrice = toMoney(payload.purchasePrice);
  if (payload.sellPrice !== undefined) doc.sellPrice = toMoney(payload.sellPrice);
  if (payload.supplier !== undefined) doc.supplier = String(payload.supplier).trim();
  if (payload.location !== undefined) doc.location = String(payload.location).trim();
  if (payload.isActive !== undefined) doc.isActive = Boolean(payload.isActive);
  await doc.save();
  await recordAudit({
    user: actor,
    action: 'update',
    entity: 'medicine-batch',
    entityId: doc._id,
    description: `Batch "${doc.batchNumber}" updated`,
    meta: { medicine: doc.medicine },
  });
  return sanitizeBatch(doc);
}

// Receive stock into an existing batch (purchase).
async function receiveStock(batchId, payload, actor) {
  const batch = await MedicineBatch.findOne({ _id: batchId, isDeleted: { $ne: true } });
  if (!batch) throw new ApiError(404, 'Batch not found');
  const qty = Number(payload && payload.quantity);
  if (!Number.isFinite(qty) || qty <= 0) throw new ApiError(400, 'Quantity must be a positive number.');

  await applyBatchDelta(batchId, qty, {
    actor,
    action: 'purchase',
    refType: 'batch',
    refId: batchId,
    reason: payload.reason || '',
    notes: payload.notes || 'Stock received',
  });

  const patch = {};
  if (payload.purchasePrice !== undefined) patch.purchasePrice = toMoney(payload.purchasePrice);
  if (payload.sellPrice !== undefined) patch.sellPrice = toMoney(payload.sellPrice);
  if (payload.expiryDate !== undefined) patch.expiryDate = payload.expiryDate ? new Date(payload.expiryDate) : null;
  if (payload.supplier !== undefined) patch.supplier = String(payload.supplier || '').trim();
  if (Object.keys(patch).length) await MedicineBatch.updateOne({ _id: batchId }, { $set: patch });

  const updated = await MedicineBatch.findById(batchId);
  await recordAudit({
    user: actor,
    action: 'receive',
    entity: 'medicine-batch',
    entityId: batchId,
    description: `Received ${qty} of batch "${updated.batchNumber}" (balance ${updated.currentQuantity})`,
    meta: { batchId, quantity: qty, balanceAfter: updated.currentQuantity },
  });
  return sanitizeBatch(updated);
}

// Adjustment (up or down) with a recorded reason and movement type.
async function adjustStock(batchId, payload, actor) {
  const batch = await MedicineBatch.findOne({ _id: batchId, isDeleted: { $ne: true } });
  if (!batch) throw new ApiError(404, 'Batch not found');
  const quantity = Number(payload && payload.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) throw new ApiError(400, 'Quantity must be a positive number.');
  const reason = String((payload && payload.reason) || 'Manual adjustment').trim() || 'Manual adjustment';
  const movementType = payload.movementType || 'adjustment-out';
  const allowed = ['adjustment-in', 'adjustment-out', 'expired', 'damaged', 'wastage-out'];
  if (!allowed.includes(movementType)) throw new ApiError(400, 'Invalid movement type.');

  const isIncrement = movementType === 'adjustment-in';
  const delta = isIncrement ? quantity : -quantity;

  const updated = await applyBatchDelta(batchId, delta, {
    actor,
    action: movementType,
    refType: payload.refType || null,
    refId: payload.refId || undefined,
    reason,
    notes: (payload && payload.notes) || reason,
  });
  await recordAudit({
    user: actor,
    action: 'adjust',
    entity: 'medicine-batch',
    entityId: batchId,
    description: `Adjusted batch "${batch.batchNumber}" by ${delta} (${reason}, balance ${updated.currentQuantity})`,
    meta: { movementType, delta, reason, medicine: String(batch.medicine) },
  });
  return sanitizeBatch(updated);
}

// ---------------------------------------------------------------------------
// Stock returns
// ---------------------------------------------------------------------------

async function createReturn(payload, actor) {
  const qty = Number(payload && payload.quantity);
  if (!Number.isFinite(qty) || qty <= 0) throw new ApiError(400, 'Quantity must be a positive number.');
  const batch = await MedicineBatch.findOne({ _id: payload.batchId, isDeleted: { $ne: true } });
  if (!batch) throw new ApiError(404, 'Batch not found');
  const doc = await StockReturn.create({
    returnNumber: await nextReturnNumber(),
    medicine: batch.medicine,
    batch: batch._id,
    dispensing: payload.dispensingId || null,
    patient: payload.patientId || null,
    quantity: qty,
    canRestock: payload.canRestock === false ? false : true,
    reason: payload.reason ? String(payload.reason).trim() : '',
    status: 'pending',
    requestedBy: actor ? actor._id : undefined,
  });
  await recordAudit({
    user: actor,
    action: 'return',
    entity: 'stock-return',
    entityId: doc._id,
    description: `Return ${doc.returnNumber} requested for batch "${batch.batchNumber}" (${qty} units)`,
    meta: { medicineId: batch.medicine, batchId: doc.batch, restoring: doc.canRestock },
  });
  return { id: doc._id, returnNumber: doc.returnNumber, status: doc.status };
}

async function confirmReturn(returnId, actor) {
  const doc = await StockReturn.findById(returnId);
  if (!doc) throw new ApiError(404, 'Return not found');
  if (doc.status !== 'pending') throw new ApiError(409, `Return is already "${doc.status}".`);
  if (doc.canRestock) {
    await applyBatchDelta(doc.batch, doc.quantity, {
      actor,
      action: 'returned',
      refType: 'return',
      refId: doc._id,
      reason: doc.reason || 'Returned medicine',
      notes: 'Return restored to stock',
    });
  }
  doc.status = 'confirmed';
  doc.confirmedBy = actor ? actor._id : undefined;
  doc.confirmedAt = new Date();
  await doc.save();
  await recordAudit({
    user: actor,
    action: 'confirm',
    entity: 'stock-return',
    entityId: doc._id,
    description: `Return ${doc.returnNumber} confirmed (${doc.quantity} units ${doc.canRestock ? 'restocked' : 'recorded only'})`,
    meta: { batchId: doc.batch, medicineId: doc.medicine },
  });
  return { id: doc._id, returnNumber: doc.returnNumber, status: doc.status };
}

async function cancelReturn(returnId, actor) {
  const doc = await StockReturn.findById(returnId);
  if (!doc) throw new ApiError(404, 'Return not found');
  if (doc.status !== 'pending') throw new ApiError(409, `Return is already "${doc.status}".`);
  doc.status = 'cancelled';
  await doc.save();
  return { id: doc._id, returnNumber: doc.returnNumber, status: doc.status };
}

// ---------------------------------------------------------------------------
// Medicine registry
// ---------------------------------------------------------------------------

const MEDICINE_CATEGORIES = ['antibiotic', 'analgesic', 'anti-inflammatory', 'mouthwash', 'anesthetic', 'steroidal', 'supplement', 'other'];
const DOSAGE_FORMS = ['tablet', 'capsule', 'syrup', 'suspension', 'cream', 'gel', 'ointment', 'mouthwash', 'drops', 'injection', 'other'];

function assertCategory(c) {
  if (c && !MEDICINE_CATEGORIES.includes(c)) throw new ApiError(400, 'Invalid medicine category.');
  return c;
}
function assertDosageForm(f) {
  if (f && !DOSAGE_FORMS.includes(f)) throw new ApiError(400, 'Invalid dosage form.');
  return f;
}

async function createMedicine(payload, actor) {
  const name = String((payload && payload.name) || '').trim();
  if (!name) throw new ApiError(400, 'Medicine name is required.');

  const reorderLevel = Number((payload && payload.reorderLevel) || 0);
  if (!Number.isFinite(reorderLevel) || reorderLevel < 0) throw new ApiError(400, 'Reorder level must be a non-negative number.');

  let expiryDate = null;
  if (payload && payload.expiryDate) {
    const d = new Date(payload.expiryDate);
    if (Number.isNaN(d.getTime())) throw new ApiError(400, 'Invalid expiry date.');
    expiryDate = d;
  }

  const med = await Medicine.create({
    name,
    genericName: payload && payload.genericName ? String(payload.genericName).trim() : '',
    brandName: payload && payload.brandName ? String(payload.brandName).trim() : '',
    category: assertCategory(payload && payload.category) || 'other',
    strength: payload && payload.strength ? String(payload.strength).trim() : '',
    dosageForm: assertDosageForm(payload && payload.dosageForm) || 'tablet',
    unit: payload && payload.unit ? String(payload.unit).trim() : 'tablet',
    manufacturer: payload && payload.manufacturer ? String(payload.manufacturer).trim() : '',
    sku: payload && payload.sku ? String(payload.sku).trim() : '',
    barcode: payload && payload.barcode ? String(payload.barcode).trim() : '',
    description: payload && payload.description ? String(payload.description).trim() : '',
    expiryDate,
    batchNumber: payload && payload.batchNumber ? String(payload.batchNumber).trim() : '',
    quantity: 0,
    reorderLevel,
    costPrice: toMoney(payload && payload.costPrice),
    sellPrice: toMoney(payload && payload.sellPrice),
    supplier: payload && payload.supplier ? String(payload.supplier).trim() : '',
    isActive: payload && payload.isActive === false ? false : true,
    createdBy: actor._id,
  });

  // Legacy opening stock: model it as an auto batch so it is auditable.
  const legacyQty = Number(payload && payload.quantity);
  if ((Number.isFinite(legacyQty) && legacyQty > 0) || (payload && payload.batchNumber)) {
    await ensureBatch(med._id, {
      batchNumber: payload && payload.batchNumber || null,
      expiryDate,
      quantity: legacyQty,
      purchasePrice: payload && payload.costPrice,
      sellPrice: payload && payload.sellPrice,
      supplier: payload && payload.supplier,
    }, actor);
  }

  await recordAudit({
    user: actor,
    action: 'create',
    entity: 'medicine',
    entityId: med._id,
    description: `Medicine "${med.name}" added to inventory`,
    meta: { category: med.category, sku: med.sku },
  });

  const batches = await listBatches({ medicineId: med._id, includeInactive: true });
  return sanitizeMedicine(med, batches);
}

async function updateMedicine(id, payload, actor) {
  const doc = await Medicine.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new ApiError(404, 'Medicine not found');
  if (payload.name !== undefined) {
    const name = String(payload.name).trim();
    if (!name) throw new ApiError(400, 'Medicine name is required.');
    doc.name = name;
  }
  if (payload.genericName !== undefined) doc.genericName = String(payload.genericName).trim();
  if (payload.brandName !== undefined) doc.brandName = String(payload.brandName).trim();
  if (payload.category !== undefined) doc.category = assertCategory(payload.category);
  if (payload.dosageForm !== undefined) doc.dosageForm = assertDosageForm(payload.dosageForm);
  if (payload.strength !== undefined) doc.strength = String(payload.strength).trim();
  if (payload.unit !== undefined) doc.unit = String(payload.unit).trim();
  if (payload.manufacturer !== undefined) doc.manufacturer = String(payload.manufacturer).trim();
  if (payload.sku !== undefined) doc.sku = String(payload.sku).trim();
  if (payload.barcode !== undefined) doc.barcode = String(payload.barcode).trim();
  if (payload.description !== undefined) doc.description = String(payload.description).trim();
  if (payload.reorderLevel !== undefined) {
    const rl = Number(payload.reorderLevel);
    if (!Number.isFinite(rl) || rl < 0) throw new ApiError(400, 'Reorder level must be a non-negative number.');
    doc.reorderLevel = rl;
  }
  if (payload.costPrice !== undefined) doc.costPrice = toMoney(payload.costPrice);
  if (payload.sellPrice !== undefined) doc.sellPrice = toMoney(payload.sellPrice);
  if (payload.supplier !== undefined) doc.supplier = String(payload.supplier).trim();
  if (payload.isActive !== undefined) doc.isActive = Boolean(payload.isActive);
  await doc.save();

  await recordAudit({
    user: actor,
    action: 'update',
    entity: 'medicine',
    entityId: doc._id,
    description: `Medicine "${doc.name}" updated`,
    meta: { category: doc.category, isActive: doc.isActive },
  });
  const batches = await listBatches({ medicineId: id, includeInactive: true });
  return sanitizeMedicine(doc, batches);
}

const escapeRx = (s) => String(s).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function listMedicines(opts = {}) {
  const { q, category, lowStock, outOfStock, expiringSoon, expired, activeOnly, limit = 500 } = opts;
  const query = { isDeleted: { $ne: true } };
  if (category) query.category = category;
  if (activeOnly) query.isActive = true;
  if (q) {
    const rx = new RegExp(escapeRx(q), 'i');
    query.$or = [
      { name: rx }, { genericName: rx }, { brandName: rx }, { sku: rx },
      { barcode: rx }, { manufacturer: rx }, { supplier: rx }, { category: rx },
    ];
  }

  const n = Math.min(Number(limit) || 500, 1000);
  const docs = await Medicine.find(query).sort({ name: 1 }).limit(n);
  const ids = docs.map((m) => m._id);
  const batchDocs = await MedicineBatch.find({ medicine: { $in: ids }, isDeleted: { $ne: true } }).sort({ expiryDate: 1 }).lean();
  const byMed = new Map();
  for (const b of batchDocs) {
    const key = String(b.medicine);
    if (!byMed.has(key)) byMed.set(key, []);
    byMed.get(key).push(b);
  }
  let rows = docs.map((m) => sanitizeMedicine(m, byMed.get(String(m._id)) || []));
  if (lowStock) rows = rows.filter((r) => r.lowStock);
  if (outOfStock) rows = rows.filter((r) => r.outOfStock);
  if (expiringSoon) rows = rows.filter((r) => r.expiringSoon);
  if (expired) rows = rows.filter((r) => r.expired);
  return rows;
}

async function searchMedicines(q = '') {
  const rx = new RegExp(escapeRx(q), 'i');
  const docs = await Medicine.find({
    isActive: true,
    isDeleted: { $ne: true },
    $or: [
      { name: rx }, { genericName: rx }, { brandName: rx }, { sku: rx },
      { barcode: rx }, { manufacturer: rx },
    ],
  })
    .sort({ name: 1 })
    .limit(25);
  return docs.map((m) => sanitizeMedicine(m, []));
}

async function getMedicine(id) {
  const doc = await Medicine.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new ApiError(404, 'Medicine not found');
  const batches = await listBatches({ medicineId: id, includeInactive: true });
  return sanitizeMedicine(doc, batches);
}

async function deleteMedicine(id, actor) {
  const doc = await Medicine.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new ApiError(404, 'Medicine not found');
  doc.isDeleted = true;
  doc.deletedAt = new Date();
  if (actor && actor._id) doc.deletedBy = actor._id;
  await doc.save();
  await recordAudit({
    user: actor,
    action: 'delete',
    entity: 'medicine',
    entityId: doc._id,
    description: `Medicine "${doc.name}" soft deleted`,
  });
  return { success: true, message: 'Record deleted successfully.' };
}

async function restoreMedicine(id, actor) {
  const doc = await Medicine.findById(id);
  if (!doc) throw new ApiError(404, 'Medicine not found');
  doc.isDeleted = false;
  doc.deletedAt = null;
  doc.deletedBy = null;
  await doc.save();
  const batches = await listBatches({ medicineId: id, includeInactive: true });
  return sanitizeMedicine(doc, batches);
}

async function listMovements(opts = {}) {
  const query = {};
  if (opts.medicineId) query.medicine = opts.medicineId;
  if (opts.batchId) query.batch = opts.batchId;
  if (opts.action) query.action = opts.action;
  if (opts.refType) query.refType = opts.refType;
  if (opts.refId) query.refId = opts.refId;
  if (opts.from || opts.to) {
    query.createdAt = {};
    if (opts.from) query.createdAt.$gte = new Date(opts.from);
    if (opts.to) query.createdAt.$lte = new Date(opts.to);
  }
  const docs = await InventoryTransaction.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(opts.limit) || 100, 500))
    .populate('medicine', 'name genericName')
    .populate('batch', 'batchNumber')
    .populate('performedBy', 'name');
  return docs.map((mv) => {
    const d = mv.toObject ? mv.toObject() : mv;
    return {
      id: d._id,
      medicine: d.medicine,
      batch: d.batch,
      action: d.action,
      quantityChange: d.quantityChange,
      previousQuantity: d.previousQuantity ?? d.balanceAfter - d.quantityChange,
      newQuantity: d.newQuantity ?? d.balanceAfter,
      balanceAfter: d.balanceAfter,
      refType: d.refType || null,
      refId: d.refId || null,
      reason: d.reason || '',
      notes: d.notes || '',
      performedBy: d.performedBy,
      createdAt: d.createdAt,
    };
  });
}

// Inventory / pharmacy dashboard summary.
async function summary(pharmacyData = null) {
  const meds = await Medicine.find({ isActive: true }).sort({ name: 1 }).lean();
  const ids = meds.map((m) => m._id);
  const batchDocs = await MedicineBatch.find({ medicine: { $in: ids } }).sort({ expiryDate: 1 }).lean();
  const byMed = new Map();
  for (const b of batchDocs) {
    const key = String(b.medicine);
    if (!byMed.has(key)) byMed.set(key, []);
    byMed.get(key).push(b);
  }

  const lowStock = [];
  const outOfStock = [];
  const expiringSoon = [];
  const expired = [];
  let totalStock = 0;
  for (const m of meds) {
    const s = sanitizeMedicine(m, byMed.get(String(m._id)) || []);
    totalStock += s.totalStock;
    if (s.outOfStock) outOfStock.push(s);
    if (s.lowStock) lowStock.push(s);
    if (s.expiringSoon) expiringSoon.push(s);
    if (s.expired) expired.push(s);
  }

  const today = startOfDay();
  const dispensedToday = await InventoryTransaction.find({
    action: 'dispense',
    createdAt: { $gte: today, $lt: new Date(today.getTime() + 86400000) },
  }).countDocuments();

  const recentDispenses = await InventoryTransaction.find({ action: 'dispense' })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('medicine', 'name genericName')
    .populate('performedBy', 'name');

  return {
    totalMedicines: meds.length,
    totalStock,
    lowStock,
    lowStockCount: lowStock.length,
    outOfStock,
    outOfStockCount: outOfStock.length,
    expiringSoon,
    expiringSoonCount: expiringSoon.length,
    expired,
    expiredCount: expired.length,
    dispensedToday,
    recentDispenses: recentDispenses.map((t) => ({
      id: t._id,
      medicine: t.medicine,
      quantityChange: t.quantityChange,
      balanceAfter: t.balanceAfter,
      refId: t.refId,
      performedBy: t.performedBy,
      createdAt: t.createdAt,
    })),
    ...(pharmacyData || {}),
  };
}

module.exports = {
  EXPIRY_WARNING_DAYS,
  MEDICINE_CATEGORIES,
  DOSAGE_FORMS,
  sanitizeMedicine,
  sanitizeBatch,
  stockAlertLabels,
  startOfDay,
  isExpiredDate,
  isExpiringSoonDate,
  daysUntil,
  createMedicine,
  updateMedicine,
  listMedicines,
  searchMedicines,
  getMedicine,
  deleteMedicine,
  restoreMedicine,
  listBatches,
  getBatch,
  createBatch,
  updateBatch,
  receiveStock,
  adjustStock,
  applyBatchDelta,
  ensureBatch,
  createReturn,
  confirmReturn,
  cancelReturn,
  listMovements,
  reconcileMedicineStock,
  summary,
};