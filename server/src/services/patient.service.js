const Patient = require('../models/Patient');
const { nextPatientId } = require('../models/Counter');
const ApiError = require('../utils/ApiError');

function normalize(input) {
  return {
    title: input.title,
    firstName: input.firstName,
    lastName: input.lastName,
    dob: input.dob || null,
    gender: input.gender || 'unknown',
    phone: input.phone,
    email: input.email,
    address: input.address,
    city: input.city,
    occupation: input.occupation,
    emergencyContact: input.emergencyContact,
    bloodGroup: input.bloodGroup,
    permanentAlerts: Array.isArray(input.permanentAlerts)
      ? input.permanentAlerts
      : input.permanentAlerts
        ? [input.permanentAlerts]
        : [],
    // Dental OP Record fields
    manualAge: input.manualAge != null ? Number(input.manualAge) || null : null,
    medicalHistory: input.medicalHistory || undefined,
    currentMedications: input.currentMedications || '',
    vitals: input.vitals || undefined,
    habits: input.habits || undefined,
    dentalHistory: input.dentalHistory || '',
  };
}

async function createPatient(payload) {
  if (!payload.firstName || !payload.lastName) {
    throw new ApiError(400, 'First and last name are required');
  }
  const patientId = await nextPatientId();
  const data = normalize(payload);
  const patient = await Patient.create({ ...data, patientId });
  return patient;
}

async function listPatients({ doctorId, search, limit = 25, skip = 0 } = {}) {
  const filter = { isArchived: false, isDeleted: { $ne: true } };

  if (doctorId) {
    const { Appointment } = require('../models/Appointment');
    const { Consultation } = require('../models/Consultation');
    const { Visit } = require('../models/Visit');

    const [apptPats, consultPats, visitPats] = await Promise.all([
      Appointment.distinct('patient', { doctor: doctorId, isDeleted: { $ne: true } }),
      Consultation.distinct('patient', { doctor: doctorId, isDeleted: { $ne: true } }),
      Visit.distinct('patient', { doctor: doctorId, isDeleted: { $ne: true } }),
    ]);

    const assignedSet = new Set([
      ...apptPats.map((id) => id?.toString()),
      ...consultPats.map((id) => id?.toString()),
      ...visitPats.map((id) => id?.toString()),
    ].filter(Boolean));

    filter._id = { $in: Array.from(assignedSet) };
  }

  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { firstName: rx },
      { lastName: rx },
      { patientId: rx },
      { phone: rx },
    ];
  }
  const [items, total] = await Promise.all([
    Patient.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Patient.countDocuments(filter),
  ]);
  return { items, total };
}

async function checkDuplicatePatient({ phone, firstName, lastName } = {}) {
  const conditions = [];
  if (phone && phone.trim()) {
    conditions.push({ phone: phone.trim() });
  }
  if (firstName && lastName) {
    const rxFirst = new RegExp(`^${firstName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const rxLast = new RegExp(`^${lastName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    conditions.push({ firstName: rxFirst, lastName: rxLast });
  }
  if (conditions.length === 0) {
    return { isDuplicate: false, matches: [] };
  }

  const matches = await Patient.find({
    isArchived: false,
    isDeleted: { $ne: true },
    $or: conditions,
  }).limit(10);

  return {
    isDuplicate: matches.length > 0,
    matches,
  };
}

async function updatePatient(id, payload) {
  const patient = await Patient.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!patient) throw new ApiError(404, 'Patient not found');

  const data = normalize({ ...patient.toObject(), ...payload });
  Object.assign(patient, data);
  await patient.save();
  return patient;
}

async function getPatient(id) {
  const patient = await Patient.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!patient) throw new ApiError(404, 'Patient not found');
  return patient;
}

async function deletePatient(id, actor) {
  const patient = await Patient.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!patient) throw new ApiError(404, 'Patient not found');
  patient.isDeleted = true;
  patient.deletedAt = new Date();
  if (actor && actor._id) patient.deletedBy = actor._id;
  await patient.save();
  return { success: true, message: 'Record deleted successfully.' };
}

async function restorePatient(id) {
  const patient = await Patient.findById(id);
  if (!patient) throw new ApiError(404, 'Patient not found');
  patient.isDeleted = false;
  patient.deletedAt = null;
  patient.deletedBy = null;
  await patient.save();
  return patient;
}

module.exports = {
  createPatient,
  listPatients,
  getPatient,
  checkDuplicatePatient,
  updatePatient,
  deletePatient,
  restorePatient,
};