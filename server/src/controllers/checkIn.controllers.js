const asyncHandler = require('../utils/asyncHandler');
const checkInService = require('../services/checkIn.service');

const checkInAppointment = asyncHandler(async (req, res) => {
  const { appointmentId, doctorId } = req.body;
  const result = await checkInService.checkInAppointment({ appointmentId, doctorId });
  res.status(200).json({ success: true, message: 'Appointment checked in', ...result });
});

const checkInWalkIn = asyncHandler(async (req, res) => {
  const { patientId, doctorId, reason, time, type } = req.body;
  const result = await checkInService.checkInWalkIn({ patientId, doctorId, reason, time, type });
  res.status(201).json({ success: true, message: 'Walk-in checked in', ...result });
});

const getQueue = asyncHandler(async (req, res) => {
  const { date, doctor, status } = req.query;
  const visits = await checkInService.getQueueList({ date, doctor, status });
  res.status(200).json({ success: true, visits });
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const visit = await checkInService.updateQueueStatus(req.params.visitId, status);
  res.status(200).json({ success: true, message: 'Queue status updated', visit });
});

module.exports = {
  checkInAppointment,
  checkInWalkIn,
  getQueue,
  updateStatus,
};
