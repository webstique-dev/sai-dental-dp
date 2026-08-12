const asyncHandler = require('../utils/asyncHandler');
const prescriptionService = require('../services/prescription.service');

const create = asyncHandler(async (req, res) => {
  const prescription = await prescriptionService.create(req.body, req.user);
  res.status(201).json({ success: true, message: 'Prescription saved successfully.', prescription });
});

const get = asyncHandler(async (req, res) => {
  const prescription = await prescriptionService.get(req.params.id, req.user);
  res.status(200).json({ success: true, prescription });
});

const print = asyncHandler(async (req, res) => {
  const prescription = await prescriptionService.getPrintView(req.params.id, req.user);
  res.status(200).json({ success: true, prescription });
});

const update = asyncHandler(async (req, res) => {
  const prescription = await prescriptionService.update(req.params.id, req.body, req.user);
  res.status(200).json({ success: true, message: 'Prescription updated.', prescription });
});

const issue = asyncHandler(async (req, res) => {
  const prescription = await prescriptionService.issue(req.params.id, req.user);
  res.status(200).json({ success: true, message: 'Prescription issued successfully.', prescription });
});

const listByPatient = asyncHandler(async (req, res) => {
  const prescriptions = await prescriptionService.listByPatient(req.params.patientId, req.user);
  res.status(200).json({ success: true, prescriptions });
});

const listByConsultation = asyncHandler(async (req, res) => {
  const prescriptions = await prescriptionService.listByConsultation(req.params.consultationId, req.user);
  res.status(200).json({ success: true, prescriptions });
});

const remove = asyncHandler(async (req, res) => {
  const result = await prescriptionService.remove(req.params.id, req.user);
  res.status(200).json({ success: true, message: result.message });
});

const restore = asyncHandler(async (req, res) => {
  const prescription = await prescriptionService.restore(req.params.id, req.user);
  res.status(200).json({ success: true, message: 'Prescription restored successfully.', prescription });
});

module.exports = { create, get, update, issue, print, listByPatient, listByConsultation, remove, restore };
