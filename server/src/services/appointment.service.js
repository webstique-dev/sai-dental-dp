const { Appointment } = require('../models/Appointment');
const { nextAppointmentNumber } = require('../models/Counter');
const Patient = require('../models/Patient');
const { User } = require('../models/User');
const ApiError = require('../utils/ApiError');

async function createAppointment(payload) {
  if (!payload.patient || !payload.doctor || !payload.date) {
    throw new ApiError(400, 'Patient, doctor and date are required');
  }
  const patient = await Patient.findById(payload.patient);
  if (!patient) throw new ApiError(404, 'Patient not found');
  const doctor = await User.findById(payload.doctor);
  if (!doctor || doctor.role !== 'doctor') {
    throw new ApiError(400, 'Selected doctor is not valid');
  }

  const appointmentNumber = await nextAppointmentNumber();
  const appointment = await Appointment.create({
    appointmentNumber,
    patient: patient._id,
    doctor: doctor._id,
    date: payload.date,
    time: payload.time,
    type: payload.type,
    reason: payload.reason,
    notes: payload.notes,
    source: payload.source,
    status: payload.status,
    token: payload.token,
  });
  return appointment;
}

async function listAppointments({ listDate, doctor, status, limit = 100 } = {}) {
  const filter = {};
  if (listDate) {
    const start = new Date(listDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    filter.date = { $gte: start, $lt: end };
  }
  if (doctor) filter.doctor = doctor;
  if (status) filter.status = status;

  return Appointment.find(filter)
    .populate('patient', 'firstName lastName patientId gender phone')
    .populate('doctor', 'name role')
    .sort({ date: 1 })
    .limit(limit);
}

module.exports = { createAppointment, listAppointments };