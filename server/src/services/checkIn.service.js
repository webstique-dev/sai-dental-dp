const { Appointment } = require('../models/Appointment');
const { Visit } = require('../models/Visit');
const Patient = require('../models/Patient');
const { User } = require('../models/User');
const { nextOpNumber, nextAppointmentNumber, nextDailyTokenNumber } = require('../models/Counter');
const ApiError = require('../utils/ApiError');

async function checkInAppointment({ appointmentId, doctorId }) {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) throw new ApiError(404, 'Appointment not found');

  if (appointment.status === 'cancelled') {
    throw new ApiError(400, 'Cannot check in a cancelled appointment');
  }

  // If already checked in and has visit, return existing
  if (appointment.visit && appointment.token) {
    const existingVisit = await Visit.findById(appointment.visit)
      .populate('patient', 'firstName lastName patientId phone gender dob')
      .populate('doctor', 'name role')
      .populate('appointment');
    return { appointment, visit: existingVisit, token: appointment.token };
  }

  const assignedDoctorId = doctorId || appointment.doctor;
  const doctor = await User.findById(assignedDoctorId);
  if (!doctor || doctor.role !== 'doctor') {
    throw new ApiError(400, 'Selected doctor is not valid');
  }

  const token = await nextDailyTokenNumber(appointment.date || new Date());
  const opNumber = await nextOpNumber();

  const visit = await Visit.create({
    opNumber,
    opDate: new Date(),
    patient: appointment.patient,
    doctor: doctor._id,
    appointment: appointment._id,
    status: 'registered',
    token,
    source: appointment.source || 'phone',
  });

  appointment.status = 'checked-in';
  appointment.token = token;
  appointment.visit = visit._id;
  if (doctorId) {
    appointment.doctor = doctor._id;
  }
  await appointment.save();

  const populatedVisit = await Visit.findById(visit._id)
    .populate('patient', 'firstName lastName patientId phone gender dob')
    .populate('doctor', 'name role')
    .populate('appointment');

  return { appointment, visit: populatedVisit, token };
}

async function checkInWalkIn({ patientId, doctorId, reason, time, type }) {
  const patient = await Patient.findById(patientId);
  if (!patient) throw new ApiError(404, 'Patient not found');

  const doctor = await User.findById(doctorId);
  if (!doctor || doctor.role !== 'doctor') {
    throw new ApiError(400, 'Selected doctor is not valid');
  }

  const token = await nextDailyTokenNumber(new Date());
  const appointmentNumber = await nextAppointmentNumber();
  const opNumber = await nextOpNumber();

  const now = new Date();
  const timeString = time || now.toTimeString().slice(0, 5);

  const appointment = await Appointment.create({
    appointmentNumber,
    patient: patient._id,
    doctor: doctor._id,
    date: now,
    time: timeString,
    type: type || 'Walk-in Consultation',
    reason: reason || 'Walk-in consultation',
    source: 'walk-in',
    status: 'checked-in',
    token,
  });

  const visit = await Visit.create({
    opNumber,
    opDate: now,
    patient: patient._id,
    doctor: doctor._id,
    appointment: appointment._id,
    status: 'registered',
    token,
    source: 'walk-in',
  });

  appointment.visit = visit._id;
  await appointment.save();

  const populatedVisit = await Visit.findById(visit._id)
    .populate('patient', 'firstName lastName patientId phone gender dob')
    .populate('doctor', 'name role')
    .populate('appointment');

  return { appointment, visit: populatedVisit, token };
}

async function getQueueList({ date, doctor, status } = {}) {
  const filter = { isArchived: false };

  const targetDate = date ? new Date(date) : new Date();
  const start = new Date(targetDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  filter.opDate = { $gte: start, $lt: end };

  if (doctor) filter.doctor = doctor;
  if (status) filter.status = status;

  const visits = await Visit.find(filter)
    .populate('patient', 'firstName lastName patientId phone gender dob')
    .populate('doctor', 'name role')
    .populate('appointment', 'appointmentNumber type reason source time token status')
    .sort({ createdAt: 1 });

  return visits;
}

async function updateQueueStatus(visitId, status) {
  const validStatuses = ['registered', 'in-progress', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, 'Invalid visit status');
  }

  const visit = await Visit.findById(visitId);
  if (!visit) throw new ApiError(404, 'Visit record not found');

  visit.status = status;
  await visit.save();

  if (visit.appointment) {
    const appointment = await Appointment.findById(visit.appointment);
    if (appointment) {
      if (status === 'in-progress') appointment.status = 'in-consultation';
      else if (status === 'completed') appointment.status = 'completed';
      else if (status === 'cancelled') appointment.status = 'cancelled';
      await appointment.save();
    }
  }

  return Visit.findById(visitId)
    .populate('patient', 'firstName lastName patientId phone gender dob')
    .populate('doctor', 'name role')
    .populate('appointment');
}

module.exports = {
  checkInAppointment,
  checkInWalkIn,
  getQueueList,
  updateQueueStatus,
};
