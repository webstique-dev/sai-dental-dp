const asyncHandler = require('../utils/asyncHandler');
const pharmacyService = require('../services/pharmacy.service');

const listPending = asyncHandler(async (req, res) => {
  const prescriptions = await pharmacyService.listPending(req.user);
  res.status(200).json({ success: true, prescriptions });
});

const getDispenseView = asyncHandler(async (req, res) => {
  const prescription = await pharmacyService.getDispenseView(req.params.id, req.user);
  res.status(200).json({ success: true, prescription });
});

const dispense = asyncHandler(async (req, res) => {
  const prescription = await pharmacyService.dispense(req.params.id, req.body, req.user);
  res.status(200).json({ success: true, message: 'Medicines dispensed.', prescription });
});

const summary = asyncHandler(async (req, res) => {
  const data = await pharmacyService.summary(req.user);
  res.status(200).json({ success: true, summary: data });
});

module.exports = { listPending, getDispenseView, dispense, summary };