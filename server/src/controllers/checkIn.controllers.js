const asyncHandler = require('../utils/asyncHandler');
const checkInService = require('../services/checkIn.service');
const ApiError = require('../utils/ApiError');

const checkInAppointment = asyncHandler(async (req, res) => {
  const { appointmentId, doctorId } = req.body;
  const targetDoc = req.user?.role === 'doctor' ? req.user._id.toString() : doctorId;
  const result = await checkInService.checkInAppointment({ appointmentId, doctorId: targetDoc });
  res.status(200).json({ success: true, message: 'Appointment checked in', ...result });
});

const checkInWalkIn = asyncHandler(async (req, res) => {
  const { patientId, doctorId, reason, time, type } = req.body;
  const targetDoc = req.user?.role === 'doctor' ? req.user._id.toString() : doctorId;
  const result = await checkInService.checkInWalkIn({ patientId, doctorId: targetDoc, reason, time, type });
  res.status(201).json({ success: true, message: 'Walk-in checked in', ...result });
});

const getQueue = asyncHandler(async (req, res) => {
  const { date, doctor, status } = req.query;
  const targetDoc = req.user?.role === 'doctor' ? req.user._id.toString() : doctor;
  const visits = await checkInService.getQueueList({ date, doctor: targetDoc, status });
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
