const asyncHandler = require('../utils/asyncHandler');
const appointmentService = require('../services/appointment.service');

const create = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.createAppointment(req.body);
  res.status(201).json({
    success: true,
    message: 'Appointment created',
    appointment,
  });
});

const list = asyncHandler(async (req, res) => {
  const { date, doctor, status } = req.query;
  const items = await appointmentService.listAppointments({
    listDate: date,
    doctor,
    status,
  });
  res.status(200).json({ success: true, items });
});

const getById = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.getAppointment(req.params.id);
  res.status(200).json({ success: true, appointment });
});

const update = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.updateAppointment(req.params.id, req.body);
  res.status(200).json({ success: true, message: 'Appointment updated', appointment });
});

const cancel = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.cancelAppointment(req.params.id, req.body && req.body.reason);
  res.status(200).json({ success: true, message: 'Appointment cancelled', appointment });
});

const remove = asyncHandler(async (req, res) => {
  const result = await appointmentService.deleteAppointment(req.params.id, req.user);
  res.status(200).json({ success: true, message: result.message });
});

const restore = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.restoreAppointment(req.params.id);
  res.status(200).json({ success: true, message: 'Appointment restored successfully.', appointment });
});

module.exports = { create, list, getById, update, cancel, remove, restore };