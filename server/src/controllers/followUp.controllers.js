const asyncHandler = require('../utils/asyncHandler');
const followUpService = require('../services/followUp.service');

const create = asyncHandler(async (req, res) => {
  const followUp = await followUpService.create(req.body, req.user);
  res.status(201).json({ success: true, message: 'Follow-up saved.', followUp });
});

const get = asyncHandler(async (req, res) => {
  const followUp = await followUpService.get(req.params.id, req.user);
  res.status(200).json({ success: true, followUp });
});

const update = asyncHandler(async (req, res) => {
  const followUp = await followUpService.update(req.params.id, req.body, req.user);
  res.status(200).json({ success: true, message: 'Follow-up updated.', followUp });
});

const schedule = asyncHandler(async (req, res) => {
  const followUp = await followUpService.schedule(req.params.id, req.body, req.user);
  res.status(200).json({ success: true, message: 'Follow-up scheduled.', followUp });
});

const complete = asyncHandler(async (req, res) => {
  const followUp = await followUpService.complete(req.params.id, req.body, req.user);
  res.status(200).json({ success: true, message: 'Follow-up completed.', followUp });
});

const cancel = asyncHandler(async (req, res) => {
  const followUp = await followUpService.cancel(req.params.id, req.body, req.user);
  res.status(200).json({ success: true, message: 'Follow-up cancelled.', followUp });
});

const listByPatient = asyncHandler(async (req, res) => {
  const followUps = await followUpService.listByPatient(req.params.patientId, req.user);
  res.status(200).json({ success: true, followUps });
});

const listByConsultation = asyncHandler(async (req, res) => {
  const followUps = await followUpService.listByConsultation(req.params.consultationId, req.user);
  res.status(200).json({ success: true, followUps });
});

const listUpcoming = asyncHandler(async (req, res) => {
  const followUps = await followUpService.listUpcoming(
    { doctorId: req.query.doctor, limit: req.query.limit },
    req.user,
  );
  res.status(200).json({ success: true, followUps });
});

module.exports = { create, get, update, schedule, complete, cancel, listByPatient, listByConsultation, listUpcoming };