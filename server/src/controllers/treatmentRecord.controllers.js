const asyncHandler = require('../utils/asyncHandler');
const treatmentRecordService = require('../services/treatmentRecord.service');

const create = asyncHandler(async (req, res) => {
  const record = await treatmentRecordService.create(req.body, req.user);
  res.status(201).json({ success: true, message: 'Treatment record saved.', record });
});

const get = asyncHandler(async (req, res) => {
  const record = await treatmentRecordService.get(req.params.id, req.user);
  res.status(200).json({ success: true, record });
});

const update = asyncHandler(async (req, res) => {
  const record = await treatmentRecordService.update(req.params.id, req.body, req.user);
  res.status(200).json({ success: true, message: 'Treatment record updated.', record });
});

const complete = asyncHandler(async (req, res) => {
  const record = await treatmentRecordService.complete(req.params.id, req.user);
  res.status(200).json({ success: true, message: 'Treatment completed successfully.', record });
});

const cancel = asyncHandler(async (req, res) => {
  const record = await treatmentRecordService.cancel(req.params.id, req.body, req.user);
  res.status(200).json({ success: true, message: 'Treatment cancelled.', record });
});

const listByPatient = asyncHandler(async (req, res) => {
  const records = await treatmentRecordService.listByPatient(req.params.patientId, req.user);
  res.status(200).json({ success: true, records });
});

const listByConsultation = asyncHandler(async (req, res) => {
  const records = await treatmentRecordService.listByConsultation(req.params.consultationId, req.user);
  res.status(200).json({ success: true, records });
});

const listByPlan = asyncHandler(async (req, res) => {
  const records = await treatmentRecordService.listByPlan(req.params.planId, req.user);
  res.status(200).json({ success: true, records });
});

module.exports = { create, get, update, complete, cancel, listByPatient, listByConsultation, listByPlan };
