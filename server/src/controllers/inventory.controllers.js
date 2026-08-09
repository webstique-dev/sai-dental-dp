const asyncHandler = require('../utils/asyncHandler');
const inventory = require('../services/inventory.service');
const pharmacyService = require('../services/pharmacy.service');

const summary = asyncHandler(async (req, res) => {
  const data = await inventory.summary({ pendingPrescriptions: await pharmacyService.getPendingCount() });
  res.status(200).json({ success: true, summary: data });
});

const list = asyncHandler(async (req, res) => {
  const rows = await inventory.listMedicines({
    q: req.query.q,
    category: req.query.category,
    lowStock: req.query.lowStock === 'true',
    outOfStock: req.query.outOfStock === 'true',
    expiringSoon: req.query.expiringSoon === 'true',
    expired: req.query.expired === 'true',
    activeOnly: req.query.activeOnly === 'true',
    limit: req.query.limit,
  });
  res.status(200).json({ success: true, medicines: rows });
});

const lowStock = asyncHandler(async (req, res) => {
  const rows = await inventory.listMedicines({ lowStock: true, limit: req.query.limit });
  res.status(200).json({ success: true, medicines: rows });
});

const outOfStock = asyncHandler(async (req, res) => {
  const rows = await inventory.listMedicines({ outOfStock: true, limit: req.query.limit });
  res.status(200).json({ success: true, medicines: rows });
});

const expiring = asyncHandler(async (req, res) => {
  const rows = await inventory.listMedicines({ expiringSoon: true, limit: req.query.limit });
  res.status(200).json({ success: true, medicines: rows });
});

const expired = asyncHandler(async (req, res) => {
  const rows = await inventory.listMedicines({ expired: true, limit: req.query.limit });
  res.status(200).json({ success: true, medicines: rows });
});

const movements = asyncHandler(async (req, res) => {
  const transactions = await inventory.listMovements({
    medicineId: req.query.medicineId,
    batchId: req.query.batchId,
    action: req.query.action,
    refType: req.query.refType,
    refId: req.query.refId,
    from: req.query.from,
    to: req.query.to,
    limit: req.query.limit,
  });
  res.status(200).json({ success: true, transactions });
});

// Stock returns
const createReturn = asyncHandler(async (req, res) => {
  const result = await inventory.createReturn(req.body, req.user);
  res.status(201).json({ success: true, message: 'Return recorded. Stock will be restored after confirmation.', ...result });
});

const confirmReturn = asyncHandler(async (req, res) => {
  const result = await inventory.confirmReturn(req.params.id, req.user);
  res.status(200).json({ success: true, message: 'Return confirmed.', ...result });
});

const cancelReturn = asyncHandler(async (req, res) => {
  const result = await inventory.cancelReturn(req.params.id, req.user);
  res.status(200).json({ success: true, message: 'Return cancelled.', ...result });
});

module.exports = {
  summary,
  list,
  lowStock,
  outOfStock,
  expiring,
  expired,
  movements,
  createReturn,
  confirmReturn,
  cancelReturn,
};