const asyncHandler = require('../utils/asyncHandler');
const medicineService = require('../services/medicine.service');
const inventory = require('../services/inventory.service');

const list = asyncHandler(async (req, res) => {
  const medicines = await medicineService.list({
    q: req.query.q,
    category: req.query.category,
    lowStock: req.query.lowStock === 'true',
    outOfStock: req.query.outOfStock === 'true',
    expiringSoon: req.query.expiringSoon === 'true',
    expired: req.query.expired === 'true',
    activeOnly: req.query.q || req.query.category ? true : req.query.activeOnly === 'true',
  });
  res.status(200).json({ success: true, medicines });
});

const search = asyncHandler(async (req, res) => {
  const medicines = await inventory.searchMedicines(req.query.q || '');
  res.status(200).json({ success: true, medicines });
});

const get = asyncHandler(async (req, res) => {
  const medicine = await medicineService.get(req.params.id, req.user);
  res.status(200).json({ success: true, medicine });
});

const create = asyncHandler(async (req, res) => {
  const medicine = await medicineService.create(req.body, req.user);
  res.status(201).json({ success: true, message: 'Medicine added to inventory.', medicine });
});

const update = asyncHandler(async (req, res) => {
  const medicine = await medicineService.update(req.params.id, req.body, req.user);
  res.status(200).json({ success: true, message: 'Medicine updated.', medicine });
});

const addStock = asyncHandler(async (req, res) => {
  const result = await medicineService.addStock(req.params.id, req.body, req.user);
  res.status(200).json({ success: true, message: 'Stock added.', ...result });
});

const removeStock = asyncHandler(async (req, res) => {
  const result = await medicineService.removeStock(req.params.id, req.body, req.user);
  res.status(200).json({ success: true, message: 'Stock removed.', ...result });
});

const listTransactions = asyncHandler(async (req, res) => {
  const transactions = await medicineService.listTransactions({
    medicineId: req.params.medicineId,
    refType: req.query.refType,
    refId: req.query.refId,
    action: req.query.action,
    limit: req.query.limit,
  });
  res.status(200).json({ success: true, transactions });
});

const remove = asyncHandler(async (req, res) => {
  const result = await medicineService.deleteMedicine(req.params.id, req.user);
  res.status(200).json({ success: true, message: result.message });
});

const restore = asyncHandler(async (req, res) => {
  const medicine = await medicineService.restoreMedicine(req.params.id, req.user);
  res.status(200).json({ success: true, message: 'Medicine restored successfully.', medicine });
});

module.exports = { list, search, get, create, update, remove, restore, addStock, removeStock, listTransactions };