const Investigation = require('../models/Investigation');
const {
  INVESTIGATION_STATUSES,
  INVESTIGATION_TYPES,
  INVESTIGATION_PRIORITIES,
} = Investigation;
const Diagnosis = require('../models/Diagnosis');
const TreatmentPlan = require('../models/TreatmentPlan');
const Patient = require('../models/Patient');
const { Visit } = require('../models/Visit');
const { Consultation } = require('../models/Consultation');
const { User } = require('../models/User');
const { nextInvestigationNumber } = require('../models/Counter');
const { recordAudit } = require('../utils/audit');
const ApiError = require('../utils/ApiError');

// Guarded transitions; historical statuses cannot silently change.
const TRANSITIONS = {
  requested: ['scheduled', 'in-progress', 'completed', 'cancelled'],
  scheduled: ['in-progress', 'completed', 'cancelled'],
  'in-progress': ['completed', 'result-available', 'cancelled'],
  completed: ['result-available', 'cancelled'],
  'result-available': ['cancelled'],
  cancelled: [],
};

function assertStatus(s) {
  if (!INVESTIGATION_STATUSES.includes(s)) throw new ApiError(400, 'Invalid investigation status.');
  return s;
}
function assertType(t) {
  if (!INVESTIGATION_TYPES.includes(t)) throw new ApiError(400, 'Invalid investigation type.');
  return t;
}
function assertPriority(p) {
  if (!INVESTIGATION_PRIORITIES.includes(p)) throw new ApiError(400, 'Invalid priority.');
  return p;
}
function assertTransition(from, to) {
  if (from === to) return;
  if (!(TRANSITIONS[from] || []).includes(to)) {
    throw new ApiError(400, `Invalid investigation status transition: ${from} → ${to}.`);
  }
}

async function assertPatient(patientId) {
  if (!patientId) throw new ApiError(400, 'Patient is required.');
  const patient = await Patient.findById(patientId);
  if (!patient) throw new ApiError(404, 'Patient not found');
  return patient;
}

async function resolveRefs(payload, patientId) {
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
  let diagnosis = null;
  if (payload.diagnosisId) {
    diagnosis = await Diagnosis.findById(payload.diagnosisId);
    if (!diagnosis || String(diagnosis.patient) !== String(patientId)) {
      throw new ApiError(400, 'Diagnosis reference must belong to the investigation patient.');
    }
  }
  let treatmentPlan = null;
  if (payload.treatmentPlanId) {
    treatmentPlan = await TreatmentPlan.findById(payload.treatmentPlanId);
    if (!treatmentPlan || String(treatmentPlan.patient) !== String(patientId)) {
      throw new ApiError(400, 'Treatment plan reference must belong to the investigation patient.');
    }
  }
  return { visit, consultation, diagnosis, treatmentPlan };
}

function sanitizeResult(r) {
  const d = r && r.toObject ? r.toObject() : r;
  return {
    id: d._id,
    findings: d.findings || '',
    interpretation: d.interpretation || '',
    notes: d.notes || '',
    resultDate: d.resultDate,
    completedBy: d.completedBy,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

function sanitize(doc) {
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    id: d._id,
    investigationNumber: d.investigationNumber,
    patient: d.patient,
    visit: d.visit,
    consultation: d.consultation,
    doctor: d.doctor,
    diagnosis: d.diagnosis,
    treatmentPlan: d.treatmentPlan,
    type: d.type,
    customType: d.customType || '',
    typeLabel: d.type === 'other' ? (d.customType || 'Other') : d.type,
    reason: d.reason || '',
    indication: d.indication || '',
    priority: d.priority,
    requestedDate: d.requestedDate,
    status: d.status,
    notes: d.notes || '',
    completedAt: d.completedAt,
    completedBy: d.completedBy,
    result: d.result ? sanitizeResult(d.result) : null,
    resultHistory: (d.resultHistory || []).map(sanitizeResult),
    attachments: (d.attachments || []).map((a) => {
      const x = a && a.toObject ? a.toObject() : a;
      return {
        id: x._id,
        name: x.name || '',
        url: x.url || '',
        storageKey: x.storageKey || '',
        mimeType: x.mimeType || '',
        size: x.size || 0,
        uploadedBy: x.uploadedBy,
        createdAt: x.createdAt,
      };
    }),
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

const baseQuery = (id) =>
  Investigation.findOne({ _id: id, isArchived: false, isDeleted: { $ne: true } })
    .populate('patient', 'firstName lastName patientId gender phone dob')
    .populate('doctor', 'name')
    .populate('completedBy', 'name')
    .populate('visit', 'opNumber')
    .populate('consultation', 'status')
    .populate('diagnosis', 'name category toothNumber')
    .populate('treatmentPlan', 'planNumber name status')
    .populate('result.completedBy', 'name')
    .populate('attachments.uploadedBy', 'name');

async function remove(id, actor) {
  const doc = await Investigation.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new ApiError(404, 'Investigation not found');

  doc.isDeleted = true;
  doc.deletedAt = new Date();
  if (actor && actor._id) doc.deletedBy = actor._id;
  await doc.save();

  await recordAudit({
    user: actor,
    action: 'delete',
    entity: 'investigation',
    entityId: doc._id,
    description: `Investigation ${doc.investigationNumber} soft deleted`,
  });

  return { success: true, message: 'Record deleted successfully.' };
}

async function restore(id, actor) {
  const doc = await Investigation.findById(id);
  if (!doc) throw new ApiError(404, 'Investigation not found');

  doc.isDeleted = false;
  doc.deletedAt = null;
  doc.deletedBy = null;
  await doc.save();

  return sanitize(await baseQuery(id));
}

async function listByPatient(patientId, actor) {
  await assertPatient(patientId);
  const docs = await Investigation.find({ patient: patientId, isArchived: false, isDeleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .populate('patient', 'name')
    .populate('doctor', 'name')
    .populate('completedBy', 'name')
    .populate('visit', 'opNumber')
    .populate('consultation', 'status')
    .populate('diagnosis', 'name category toothNumber');
  return docs.map(sanitize);
}

async function listByConsultation(consultationId, actor) {
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) throw new ApiError(404, 'Consultation not found');
  const docs = await Investigation.find({ consultation: consultationId, isArchived: false, isDeleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .populate('patient', 'name')
    .populate('doctor', 'name')
    .populate('completedBy', 'name')
    .populate('visit', 'opNumber')
    .populate('consultation', 'status')
    .populate('diagnosis', 'name category toothNumber')
    .populate('treatmentPlan', 'name status');
  return docs.map(sanitize);
}

module.exports = {
  create,
  get,
  update,
  remove,
  restore,
  addResult,
  addAttachment,
  listByPatient,
  listByConsultation,
};

async function create(payload, actor) {
  const patient = await assertPatient(payload.patientId);
  const { visit, consultation, diagnosis, treatmentPlan } = await resolveRefs(payload, patient._id);
  const doctor = await User.findById(actor._id);
  if (!doctor || !['doctor', 'admin'].includes(doctor.role)) throw new ApiError(400, 'A valid doctor is required');

  const type = assertType(payload.type || 'opg');
  const doc = await Investigation.create({
    investigationNumber: await nextInvestigationNumber(),
    patient: patient._id,
    visit: visit ? visit._id : null,
    consultation: consultation ? consultation._id : null,
    doctor: doctor._id,
    diagnosis: diagnosis ? diagnosis._id : null,
    treatmentPlan: treatmentPlan ? treatmentPlan._id : null,
    type,
    customType: type === 'other' ? String(payload.customType || 'Other investigation').trim() : '',
    reason: payload.reason || '',
    indication: payload.indication || '',
    priority: assertPriority(payload.priority || 'routine'),
    requestedDate: payload.requestedDate || new Date(),
    status: 'requested',
    notes: payload.notes || '',
  });

  await recordAudit({
    user: actor,
    action: 'create',
    entity: 'investigation',
    entityId: doc._id,
    description: `Investigation ${doc.investigationNumber} ${type} requested`,
    meta: { patient: patient._id, opNumber: visit ? visit.opNumber : undefined, type },
  });

  return sanitize(await baseQuery(doc._id));
}

async function get(id, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Investigation not found');
  return sanitize(doc);
}

async function update(id, payload, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Investigation not found');

  if (payload.type !== undefined) doc.type = assertType(payload.type);
  if (doc.type === 'other' && payload.customType !== undefined) doc.customType = String(payload.customType).trim();
  if (payload.reason !== undefined) doc.reason = payload.reason;
  if (payload.indication !== undefined) doc.indication = payload.indication;
  if (payload.priority !== undefined) doc.priority = assertPriority(payload.priority);
  if (payload.requestedDate !== undefined) doc.requestedDate = payload.requestedDate;
  if (payload.notes !== undefined) doc.notes = payload.notes;

  if (payload.status !== undefined) {
    const next = assertStatus(payload.status);
    if (['result-available', 'completed'].includes(next) && !doc.result) {
      throw new ApiError(400, 'Add a result before marking the investigation as completed / result available.');
    }
    assertTransition(doc.status, next);
    if (next === 'completed' || next === 'result-available') {
      doc.completedAt = doc.completedAt || new Date();
      doc.completedBy = doc.completedBy || actor._id;
    }
    doc.status = next;
  }

  await doc.save();
  await recordAudit({
    user: actor,
    action: 'update',
    entity: 'investigation',
    entityId: doc._id,
    description: `Investigation ${doc.investigationNumber} updated → ${doc.status}`,
    meta: { patient: doc.patient, type: doc.type },
  });

  return sanitize(await baseQuery(id));
}

async function addResult(id, payload, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Investigation not found');
  if (doc.status === 'cancelled') throw new ApiError(409, 'Cannot add a result to a cancelled investigation.');

  // Preserve previous result in append-only history.
  if (doc.result && doc.result.findings) {
    doc.resultHistory.push(doc.result);
  }
  doc.result = {
    findings: payload.findings || '',
    interpretation: payload.interpretation || '',
    notes: payload.notes || '',
    resultDate: payload.resultDate || new Date(),
    completedBy: actor._id,
  };
  doc.completedAt = new Date();
  doc.completedBy = actor._id;
  doc.status = 'result-available';
  await doc.save();

  await recordAudit({
    user: actor,
    action: 'update',
    entity: 'investigation',
    entityId: doc._id,
    description: `Investigation ${doc.investigationNumber} result added`,
    meta: { patient: doc.patient, type: doc.type },
  });

  return sanitize(await baseQuery(id));
}

async function addAttachment(id, payload, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Investigation not found');
  if (doc.status === 'cancelled') throw new ApiError(409, 'Cannot attach to a cancelled investigation.');
  if (!payload.url) throw new ApiError(400, 'Attachment URL is required.');

  doc.attachments.push({
    name: payload.name || 'attachment',
    url: String(payload.url).trim(),
    storageKey: payload.storageKey ? String(payload.storageKey).trim() : '',
    mimeType: payload.mimeType ? String(payload.mimeType).trim() : '',
    size: Number(payload.size) || 0,
    uploadedBy: actor._id,
  });
  await doc.save();

  await recordAudit({
    user: actor,
    action: 'update',
    entity: 'investigation',
    entityId: doc._id,
    description: `Investigation ${doc.investigationNumber} attachment added`,
    meta: { patient: doc.patient, name: payload.name },
  });

  return sanitize(await baseQuery(id));
}

module.exports = {
  create,
  get,
  update,
  remove,
  restore,
  addResult,
  addAttachment,
  listByPatient,
  listByConsultation,
};