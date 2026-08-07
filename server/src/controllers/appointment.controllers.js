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

module.exports = { create, list };