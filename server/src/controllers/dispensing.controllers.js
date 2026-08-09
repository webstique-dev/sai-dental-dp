const asyncHandler = require('../utils/asyncHandler');
const dispensingService = require('../services/dispensing.service');

const create = asyncHandler(async (req, res) => {
  const { prescriptionId, ...payload } = req.body;
  if (!prescriptionId) {
    const err = new Error('prescriptionId is required.');
    err.statusCode = 400;
    throw err;
  }
  const result = await dispensingService.create(prescriptionId, payload, req.user);
  res.status(201).json({
    success: true,
    message: 'Dispensing completed successfully.',
    ...result,
  });
});

const get = asyncHandler(async (req, res) => {
  const dispensing = await dispensingService.get(req.params.id);
  res.status(200).json({ success: true, dispensing });
});

const listByPrescription = asyncHandler(async (req, res) => {
  const dispensing = await dispensingService.listByPrescription(req.params.prescriptionId, req.user);
  res.status(200).json({ success: true, dispensing });
});

const listByPatient = asyncHandler(async (req, res) => {
  const dispensing = await dispensingService.listByPatient(req.params.patientId, req.user);
  res.status(200).json({ success: true, dispensing });
});

const complete = asyncHandler(async (req, res) => {
  const dispensing = await dispensingService.complete(req.params.id, req.user);
  res.status(200).json({ success: true, message: 'Dispensing completed successfully.', dispensing });
});

const cancel = asyncHandler(async (req, res) => {
  const dispensing = await dispensingService.cancel(req.params.id, req.body, req.user);
  res.status(200).json({ success: true, message: 'Dispensing cancelled.', dispensing });
});

module.exports = { create, get, listByPrescription, listByPatient, complete, cancel };