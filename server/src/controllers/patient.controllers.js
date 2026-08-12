const asyncHandler = require('../utils/asyncHandler');
const patientService = require('../services/patient.service');

const create = asyncHandler(async (req, res) => {
  const patient = await patientService.createPatient(req.body);
  res.status(201).json({ success: true, message: 'Patient registered', patient });
});

const list = asyncHandler(async (req, res) => {
  const { search, limit, skip } = req.query;
  const doctorId = req.user?.role === 'doctor' ? req.user._id : undefined;
  const result = await patientService.listPatients({
    doctorId,
    search,
    limit: parseInt(limit, 10) || 25,
    skip: parseInt(skip, 10) || 0,
  });
  res.status(200).json({ success: true, ...result });
});

const getById = asyncHandler(async (req, res) => {
  const patient = await patientService.getPatient(req.params.id);
  res.status(200).json({ success: true, patient });
});

const checkDuplicate = asyncHandler(async (req, res) => {
  const { phone, firstName, lastName } = req.query;
  const result = await patientService.checkDuplicatePatient({ phone, firstName, lastName });
  res.status(200).json({ success: true, ...result });
});

const update = asyncHandler(async (req, res) => {
  const patient = await patientService.updatePatient(req.params.id, req.body);
  res.status(200).json({ success: true, message: 'Patient updated', patient });
});

const remove = asyncHandler(async (req, res) => {
  const result = await patientService.deletePatient(req.params.id, req.user);
  res.status(200).json({ success: true, message: result.message });
});

const restore = asyncHandler(async (req, res) => {
  const patient = await patientService.restorePatient(req.params.id);
  res.status(200).json({ success: true, message: 'Patient restored successfully.', patient });
});

module.exports = { create, list, getById, checkDuplicate, update, remove, restore };