const asyncHandler = require('../utils/asyncHandler');
const patientService = require('../services/patient.service');

const create = asyncHandler(async (req, res) => {
  const patient = await patientService.createPatient(req.body);
  res.status(201).json({ success: true, message: 'Patient registered', patient });
});

const list = asyncHandler(async (req, res) => {
  const { search, limit, skip } = req.query;
  const result = await patientService.listPatients({
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

module.exports = { create, list, getById };