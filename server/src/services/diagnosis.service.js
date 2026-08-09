const Diagnosis = require('../models/Diagnosis');
const { DIAGNOSIS_CATEGORIES, DIAGNOSIS_STATUSES } = Diagnosis;
const Patient = require('../models/Patient');
const { Visit } = require('../models/Visit');
const { Consultation } = require('../models/Consultation');
const { TOOTH_NUMBER_SET } = require('../models/PatientTooth');
const { recordAudit } = require('../utils/audit');
const ApiError = require('../utils/ApiError');

function assertStatus(status) {
  if (!DIAGNOSIS_STATUSES.includes(status)) {
    throw new ApiError(400, 'Invalid diagnosis status.');
  }
  return status;
}

function assertCategory(category) {
  if (!DIAGNOSIS_CATEGORIES.includes(category)) {
    throw new ApiError(400, 'Invalid diagnosis category.');
  }
  return category;
}

function assertTooth(number) {
  // Treat falsy/empty as "general" (no specific tooth).
  if (number === undefined || number === null || number === '' || Number(number) === 0) {
    return { hasTooth: false, toothNumber: 0 };
  }
  const num = Number(number);
  if (!Number.isInteger(num) || !TOOTH_NUMBER_SET.has(num)) {
    throw new ApiError(400, 'Invalid tooth number. Use a valid FDI permanent tooth number.');
  }
  return { hasTooth: true, toothNumber: num };
}

async function assertPatient(patientId) {
  const patient = await Patient.findById(patientId);
  if (!patient) throw new ApiError(404, 'Patient not found');
  return patient;
}

async function resolveRefs(payload) {
  let visit = null;
  if (payload.visitId) {
    visit = await Visit.findById(payload.visitId);
    if (!visit) throw new ApiError(404, 'OP visit not found');
  }
  let consultation = null;
  if (payload.consultationId) {
    consultation = await Consultation.findById(payload.consultationId);
    if (!consultation) throw new ApiError(404, 'Consultation not found');
  }
  return { visit, consultation };
}

function sanitize(doc) {
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    id: d._id,
    patient: d.patient,
    visit: d.visit,
    consultation: d.consultation,
    doctor: d.doctor,
    name: d.name,
    isCustom: !!d.isCustom,
    category: d.category,
    toothNumber: d.toothNumber,
    hasTooth: !!d.hasTooth,
    findings: d.findings || '',
    notes: d.notes || '',
    status: d.status,
    date: d.date,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

const baseQuery = (id) =>
  Diagnosis.findOne({ _id: id, isArchived: false })
    .populate('doctor', 'name')
    .populate('visit', 'opNumber')
    .populate('consultation', 'status');

async function create(payload, actor) {
  const patient = await assertPatient(payload.patientId);
  if (!payload.name || !String(payload.name).trim()) {
    throw new ApiError(400, 'Diagnosis name is required');
  }
  const { visit, consultation } = await resolveRefs(payload);
  const tooth = assertTooth(payload.toothNumber);

  const doc = await Diagnosis.create({
    patient: patient._id,
    visit: visit ? visit._id : null,
    consultation: consultation ? consultation._id : null,
    doctor: actor._id,
    name: String(payload.name).trim(),
    isCustom: !!payload.isCustom,
    category: assertCategory(payload.category || 'dental'),
    ...tooth,
    findings: payload.findings || '',
    notes: payload.notes || '',
    status: assertStatus(payload.status || 'active'),
    date: payload.date || new Date(),
  });

  await recordAudit({
    user: actor,
    action: 'create',
    entity: 'diagnosis',
    entityId: doc._id,
    description: `Diagnosis: ${doc.name}${tooth.hasTooth ? ` (Tooth ${tooth.toothNumber})` : ''}`,
    meta: {
      patient: patient._id,
      consultation: consultation ? consultation._id : undefined,
      name: doc.name,
      category: doc.category,
      toothNumber: doc.toothNumber,
      status: doc.status,
    },
  });

  return sanitize(await baseQuery(doc._id));
}

async function update(id, payload, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Diagnosis not found');

  if (payload.name !== undefined) {
    if (!String(payload.name).trim()) throw new ApiError(400, 'Diagnosis name is required');
    doc.name = String(payload.name).trim();
  }
  if (payload.category !== undefined) doc.category = assertCategory(payload.category);
  if (payload.status !== undefined) doc.status = assertStatus(payload.status);
  if (payload.toothNumber !== undefined) {
    const tooth = assertTooth(payload.toothNumber);
    doc.hasTooth = tooth.hasTooth;
    doc.toothNumber = tooth.toothNumber;
  }
  if (payload.findings !== undefined) doc.findings = payload.findings;
  if (payload.notes !== undefined) doc.notes = payload.notes;

  await doc.save();

  await recordAudit({
    user: actor,
    action: 'update',
    entity: 'diagnosis',
    entityId: doc._id,
    description: `Diagnosis updated: ${doc.name}`,
    meta: { patient: doc.patient, status: doc.status, toothNumber: doc.toothNumber },
  });

  return sanitize(await baseQuery(id));
}

async function listByConsultation(consultationId, actor) {
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) throw new ApiError(404, 'Consultation not found');
  const docs = await Diagnosis.find({ consultation: consultationId, isArchived: false })
    .sort({ date: -1, createdAt: -1 })
    .populate('doctor', 'name')
    .populate('visit', 'opNumber')
    .populate('consultation', 'status');
  return docs.map(sanitize);
}

async function listByPatient(patientId, actor) {
  await assertPatient(patientId);
  const docs = await Diagnosis.find({ patient: patientId, isArchived: false })
    .sort({ date: -1, createdAt: -1 })
    .populate('doctor', 'name')
    .populate('visit', 'opNumber')
    .populate('consultation', 'status');
  return docs.map(sanitize);
}

async function get(id, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Diagnosis not found');
  return sanitize(doc);
}

module.exports = {
  create,
  update,
  listByConsultation,
  listByPatient,
  get,
};