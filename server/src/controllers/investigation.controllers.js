const asyncHandler = require('../utils/asyncHandler');
const investigationService = require('../services/investigation.service');

const create = asyncHandler(async (req, res) => {
  const investigation = await investigationService.create(req.body, req.user);
  res.status(201).json({ success: true, message: 'Investigation requested successfully.', investigation });
});

const get = asyncHandler(async (req, res) => {
  const investigation = await investigationService.get(req.params.id, req.user);
  res.status(200).json({ success: true, investigation });
});

const update = asyncHandler(async (req, res) => {
  const investigation = await investigationService.update(req.params.id, req.body, req.user);
  res.status(200).json({ success: true, message: 'Investigation updated.', investigation });
});

const addResult = asyncHandler(async (req, res) => {
  const investigation = await investigationService.addResult(req.params.id, req.body, req.user);
  res.status(200).json({ success: true, message: 'Investigation result saved successfully.', investigation });
});

const addAttachment = asyncHandler(async (req, res) => {
  const investigation = await investigationService.addAttachment(req.params.id, req.body, req.user);
  res.status(201).json({ success: true, message: 'Attachment added.', investigation });
});

const listByPatient = asyncHandler(async (req, res) => {
  const investigations = await investigationService.listByPatient(req.params.patientId, req.user);
  res.status(200).json({ success: true, investigations });
});

const listByConsultation = asyncHandler(async (req, res) => {
  const investigations = await investigationService.listByConsultation(req.params.consultationId, req.user);
  res.status(200).json({ success: true, investigations });
});

const remove = asyncHandler(async (req, res) => {
  const result = await investigationService.remove(req.params.id, req.user);
  res.status(200).json({ success: true, message: result.message });
});

const restore = asyncHandler(async (req, res) => {
  const investigation = await investigationService.restore(req.params.id, req.user);
  res.status(200).json({ success: true, message: 'Investigation restored successfully.', investigation });
});

module.exports = { create, get, update, addResult, addAttachment, listByPatient, listByConsultation, remove, restore };
