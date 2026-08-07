const asyncHandler = require('../utils/asyncHandler');
const consultationService = require('../services/consultation.service');

const create = asyncHandler(async (req, res) => {
  const consultation = await consultationService.createConsultation(req.body, req.user);
  res.status(201).json({
    success: true,
    message: 'Consultation created',
    consultation,
  });
});

const getById = asyncHandler(async (req, res) => {
  const consultation = await consultationService.getConsultation(req.params.id, req.user);
  res.status(200).json({ success: true, consultation });
});

const update = asyncHandler(async (req, res) => {
  const consultation = await consultationService.reviseConsultation(req.params.id, req.body, req.user);
  res.status(200).json({
    success: true,
    message: 'Consultation saved successfully',
    consultation,
  });
});

const complete = asyncHandler(async (req, res) => {
  const consultation = await consultationService.completeConsultation(req.params.id, req.user);
  res.status(200).json({
    success: true,
    message: 'Consultation completed successfully',
    consultation,
  });
});

const patientConsultations = asyncHandler(async (req, res) => {
  const result = await consultationService.patientConsultations(req.params.patientId, req.user);
  res.status(200).json({ success: true, ...result });
});

module.exports = { create, getById, update, complete, patientConsultations };