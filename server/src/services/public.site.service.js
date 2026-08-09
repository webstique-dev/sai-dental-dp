const { User } = require('../models/User');
const Patient = require('../models/Patient');
const { Appointment } = require('../models/Appointment');
const { createPatient } = require('./patient.service');
const { createAppointment } = require('./appointment.service');
const Service = require('../models/Service');
const ApiError = require('../utils/ApiError');

const PHONE_RE = /^[+()\-\s\d]{7,20}$/;
const NAME_RE = /^[a-zA-Z\s.'`-]+$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function cleanPhone(value) {
  return String(value || '').trim().replace(/[()\-\s]/g, '');
}

function sanitizeService(doc) {
  const d = doc && doc.toObject ? doc.toObject() : doc;
  return {
    id: d._id,
    name: d.name,
    code: d.code,
    category: d.category,
    description: d.description || '',
    unitPrice: d.unitPrice || 0,
  };
}

async function listPublicServices() {
  const docs = await Service.find({ isActive: true }).sort({ name: 1 });
  return docs.map(sanitizeService);
}

function sanitizeDoctor(doc) {
  const d = doc && doc.toObject ? doc.toObject() : doc;
  return {
    id: d._id,
    name: d.name,
    specialization: d.specialization || 'General Dentistry',
  };
}

async function listPublicDoctors() {
  const docs = await User.find({ role: 'doctor', isActive: true }).sort({ name: 1 });
  return docs.map(sanitizeDoctor);
}

// Validate a public website booking request and persist it as a "requested"
// appointment with the website source. Returns a human-friendly summary.
async function requestAppointment(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new ApiError(400, 'Invalid booking request.');
  }

  const fullName = String(payload.name || '').trim().replace(/\s+/g, ' ');
  if (fullName.length < 3 || !NAME_RE.test(fullName)) {
    throw new ApiError(400, 'Please enter your full name (letters only).');
  }
  const parts = fullName.split(' ');
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ') || 'Patient';

  const phone = String(payload.phone || '').trim();
  if (!PHONE_RE.test(phone) || cleanPhone(phone).length < 10) {
    throw new ApiError(400, 'Please enter a valid phone number.');
  }

  const email = String(payload.email || '').trim().toLowerCase();
  const emailOk = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) throw new ApiError(400, 'Please enter a valid email address.');

  const preferredDate = payload.preferredDate ? new Date(payload.preferredDate) : null;
  if (!preferredDate || Number.isNaN(preferredDate.getTime())) {
    throw new ApiError(400, 'Please choose a preferred date.');
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (preferredDate < today) {
    throw new ApiError(400, 'Preferred date cannot be in the past.');
  }

  const preferredTime = String(payload.preferredTime || '');
  if (!TIME_RE.test(preferredTime)) {
    throw new ApiError(400, 'Please choose a preferred time.');
  }

  const treatment = String(payload.treatment || '').trim() || 'General Consultation';
  const message = String(payload.message || '').trim().slice(0, 2000);

  // Find existing patient by phone, otherwise register a minimal record.
  let patient = await Patient.findOne({ phone: cleanPhone(phone), isArchived: false });
  if (!patient) {
    patient = await createPatient({
      firstName,
      lastName,
      phone: cleanPhone(phone),
      email: email || undefined,
    });
  }

  // Resolve doctor: preferred doctor from the form, else first active doctor.
  let doctor = null;
  if (payload.preferredDoctorId) {
    doctor = await User.findOne({ _id: payload.preferredDoctorId, role: 'doctor', isActive: true });
    if (!doctor) throw new ApiError(400, 'Selected doctor is not available.');
  }
  if (!doctor) {
    doctor = await User.findOne({ role: 'doctor', isActive: true }).sort({ name: 1 });
  }
  if (!doctor) {
    throw new ApiError(409, 'No doctor is currently available. Please contact the clinic by phone.');
  }

  const appointment = await createAppointment({
    patient: patient._id,
    doctor: doctor._id,
    date: preferredDate,
    time: preferredTime,
    type: treatment,
    reason: `Website booking — ${treatment}`,
    notes: `${message}${email ? `\nEmail: ${email}` : ''}`.trim(),
    source: 'website',
    status: 'requested',
  });

  return {
    reference: appointment.appointmentNumber,
    status: appointment.status,
    date: preferredDate.toISOString().slice(0, 10),
    time: appointment.time,
    treatment: appointment.type,
    doctor: { name: doctor.name, specialization: doctor.specialization || 'General Dentistry' },
    patient: { fullName: `${firstName} ${lastName}`, phone: cleanPhone(phone) },
  };
}

module.exports = {
  listPublicServices,
  listPublicDoctors,
  requestAppointment,
  cleanPhone,
};