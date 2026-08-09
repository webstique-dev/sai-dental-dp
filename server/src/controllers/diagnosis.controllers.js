const asyncHandler = require('../utils/asyncHandler');
const diagnosisService = require('../services/diagnosis.service');

const create = asyncHandler(async (req, res) => {
  const diagnosis = await diagnosisService.create(req.body, req.user);
  res.status(201).json({ success: true, message: 'Diagnosis recorded', diagnosis });
});

const update = asyncHandler(async (req, res) => {
  const diagnosis = await diagnosisService.update(req.params.id, req.body, req.user);
  res.status(200).json({ success: true, message: 'Diagnosis updated', diagnosis });
});

const get = asyncHandler(async (req, res) => {
  const diagnosis = await diagnosisService.get(req.params.id, req.user);
  res.status(200).json({ success: true, diagnosis });
});

const listByConsultation = asyncHandler(async (req, res) => {
  const diagnoses = await diagnosisService.listByConsultation(req.params.consultationId, req.user);
  res.status(200).json({ success: true, diagnoses });
});

const listByPatient = asyncHandler(async (req, res) => {
  const diagnoses = await diagnosisService.listByPatient(req.params.patientId, req.user);
  res.status(200).json({ success: true, diagnoses });
});

module.exports = { create, update, get, listByConsultation, listByPatient };
