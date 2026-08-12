const asyncHandler = require('../utils/asyncHandler');
const treatmentPlanService = require('../services/treatmentPlan.service');

const create = asyncHandler(async (req, res) => {
  const plan = await treatmentPlanService.create(req.body, req.user);
  res.status(201).json({ success: true, message: 'Treatment plan created', plan });
});

const listByPatient = asyncHandler(async (req, res) => {
  const plans = await treatmentPlanService.listByPatient(req.params.patientId, req.user);
  res.status(200).json({ success: true, plans });
});

const get = asyncHandler(async (req, res) => {
  const plan = await treatmentPlanService.get(req.params.id, req.user);
  res.status(200).json({ success: true, plan });
});

const update = asyncHandler(async (req, res) => {
  const plan = await treatmentPlanService.update(req.params.id, req.body, req.user);
  res.status(200).json({ success: true, message: 'Treatment plan updated', plan });
});

const addItem = asyncHandler(async (req, res) => {
  const plan = await treatmentPlanService.addItem(req.params.id, req.body, req.user);
  res.status(201).json({ success: true, message: 'Plan item added', plan });
});

const updateItem = asyncHandler(async (req, res) => {
  const plan = await treatmentPlanService.updateItem(req.params.id, req.params.itemId, req.body, req.user);
  res.status(200).json({ success: true, message: 'Plan item updated', plan });
});

const removeItem = asyncHandler(async (req, res) => {
  const plan = await treatmentPlanService.removeItem(req.params.id, req.params.itemId, req.user);
  res.status(200).json({ success: true, message: 'Plan item removed', plan });
});

const approve = asyncHandler(async (req, res) => {
  const plan = await treatmentPlanService.approve(req.params.id, req.user);
  res.status(200).json({ success: true, message: 'Treatment plan approved', plan });
});

const decline = asyncHandler(async (req, res) => {
  const plan = await treatmentPlanService.decline(req.params.id, req.body && req.body.reason, req.user);
  res.status(200).json({ success: true, message: 'Treatment plan declined', plan });
});

const remove = asyncHandler(async (req, res) => {
  const result = await treatmentPlanService.removePlan(req.params.id, req.user);
  res.status(200).json({ success: true, message: result.message });
});

const restore = asyncHandler(async (req, res) => {
  const plan = await treatmentPlanService.restorePlan(req.params.id, req.user);
  res.status(200).json({ success: true, message: 'Treatment plan restored successfully.', plan });
});

module.exports = { create, listByPatient, get, update, addItem, updateItem, removeItem, approve, decline, remove, restore };
