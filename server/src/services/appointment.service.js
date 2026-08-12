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
  const filter = { isDeleted: { $ne: true } };
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

async function getAppointment(id) {
  const appointment = await Appointment.findOne({ _id: id, isDeleted: { $ne: true } })
    .populate('patient', 'firstName lastName patientId gender phone')
    .populate('doctor', 'name role');
  if (!appointment) throw new ApiError(404, 'Appointment not found');
  return appointment;
}

async function updateAppointment(id, payload) {
  const appointment = await Appointment.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!appointment) throw new ApiError(404, 'Appointment not found');

  if (payload.doctor && payload.doctor.toString() !== appointment.doctor.toString()) {
    const doctor = await User.findOne({ _id: payload.doctor, isDeleted: { $ne: true } });
    if (!doctor || doctor.role !== 'doctor') {
      throw new ApiError(400, 'Selected doctor is not valid');
    }
    appointment.doctor = doctor._id;
  }

  if (payload.date) appointment.date = payload.date;
  if (payload.time !== undefined) appointment.time = payload.time;
  if (payload.type !== undefined) appointment.type = payload.type;
  if (payload.reason !== undefined) appointment.reason = payload.reason;
  if (payload.notes !== undefined) appointment.notes = payload.notes;
  if (payload.status) appointment.status = payload.status;
  if (payload.source) appointment.source = payload.source;
  if (payload.token) appointment.token = payload.token;

  await appointment.save();
  return getAppointment(appointment._id);
}

async function cancelAppointment(id, reason) {
  const appointment = await Appointment.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!appointment) throw new ApiError(404, 'Appointment not found');

  appointment.status = 'cancelled';
  if (reason) {
    appointment.notes = appointment.notes ? `${appointment.notes} | Cancel reason: ${reason}` : `Cancel reason: ${reason}`;
  }

  await appointment.save();
  return getAppointment(appointment._id);
}

async function deleteAppointment(id, actor) {
  const appointment = await Appointment.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!appointment) throw new ApiError(404, 'Appointment not found');

  appointment.isDeleted = true;
  appointment.deletedAt = new Date();
  if (actor && actor._id) appointment.deletedBy = actor._id;
  await appointment.save();
  return { success: true, message: 'Record deleted successfully.' };
}

async function restoreAppointment(id) {
  const appointment = await Appointment.findById(id);
  if (!appointment) throw new ApiError(404, 'Appointment not found');

  appointment.isDeleted = false;
  appointment.deletedAt = null;
  appointment.deletedBy = null;
  await appointment.save();
  return getAppointment(appointment._id);
}

module.exports = {
  createAppointment,
  listAppointments,
  getAppointment,
  updateAppointment,
  cancelAppointment,
  deleteAppointment,
  restoreAppointment,
};