const asyncHandler = require('../utils/asyncHandler');
const inventory = require('../services/inventory.service');

const create = asyncHandler(async (req, res) => {
  const batch = await inventory.createBatch(req.params.medicineId || req.body.medicineId, req.body, req.user);
  res.status(201).json({ success: true, message: 'Batch created.', batch });
});

const list = asyncHandler(async (req, res) => {
  const batches = await inventory.listBatches({
    medicineId: req.query.medicineId,
    q: req.query.q,
    status: req.query.status,
    includeInactive: req.query.includeInactive === 'true',
  });
  res.status(200).json({ success: true, batches });
});

const get = asyncHandler(async (req, res) => {
  const batch = await inventory.getBatch(req.params.id);
  res.status(200).json({ success: true, batch });
});

const update = asyncHandler(async (req, res) => {
  const batch = await inventory.updateBatch(req.params.id, req.body, req.user);
  res.status(200).json({ success: true, message: 'Batch updated.', batch });
});

const receive = asyncHandler(async (req, res) => {
  const batch = await inventory.receiveStock(req.params.id, req.body, req.user);
  res.status(200).json({ success: true, message: 'Stock received successfully.', batch });
});

const adjust = asyncHandler(async (req, res) => {
  const batch = await inventory.adjustStock(req.params.id, req.body, req.user);
  res.status(200).json({ success: true, message: 'Stock adjustment recorded successfully.', batch });
});

// Medicine-scoped batch listing: GET /api/medicines/:medicineId/batches
const listForMedicine = asyncHandler(async (req, res) => {
  const batches = await inventory.listBatches({ medicineId: req.params.medicineId, includeInactive: true });
  res.status(200).json({ success: true, batches });
});

const movements = asyncHandler(async (req, res) => {
  const transactions = await inventory.listMovements({
    medicineId: req.params.medicineId,
    limit: req.query.limit,
  });
  res.status(200).json({ success: true, transactions });
});

module.exports = { create, list, get, update, receive, adjust, listForMedicine, movements };