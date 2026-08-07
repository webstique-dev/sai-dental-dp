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

async function listPatients({ search, limit = 25, skip = 0 } = {}) {
  const filter = { isArchived: false };
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

async function getPatient(id) {
  const patient = await Patient.findById(id);
  if (!patient) throw new ApiError(404, 'Patient not found');
  return patient;
}

module.exports = { createPatient, listPatients, getPatient };