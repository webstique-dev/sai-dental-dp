const TreatmentRecord = require('../models/TreatmentRecord');
const { TREATMENT_RECORD_STATUSES, TREATMENT_OUTCOMES } = TreatmentRecord;
const TreatmentPlan = require('../models/TreatmentPlan');
const Diagnosis = require('../models/Diagnosis');
const Patient = require('../models/Patient');
const { Visit } = require('../models/Visit');
const { Consultation } = require('../models/Consultation');
const { User } = require('../models/User');
const { TOOTH_NUMBER_SET } = require('../models/PatientTooth');
const { nextTreatmentRecordNumber } = require('../models/Counter');
const { recordAudit } = require('../utils/audit');
const ApiError = require('../utils/ApiError');
const toothChartService = require('./toothChart.service');

// Record statuses here reflect actual execution; plan-item statuses are synced separately.
const RECORD_TRANSITIONS = {
  planned: ['in-progress', 'partially-completed', 'completed', 'cancelled', 'deferred'],
  'in-progress': ['partially-completed', 'completed', 'cancelled', 'deferred'],
  'partially-completed': ['in-progress', 'completed', 'cancelled'],
  completed: [],
  cancelled: [],
  deferred: ['planned', 'in-progress'],
};

// Map a treatment record status to the plan-item (intent) status.
const ITEM_STATUS_BY_RECORD = {
  'in-progress': 'in-progress',
  'partially-completed': 'in-progress',
  completed: 'completed',
  deferred: 'deferred',
  cancelled: 'planned',
};

function assertStatus(s) {
  if (!TREATMENT_RECORD_STATUSES.includes(s)) throw new ApiError(400, 'Invalid treatment record status.');
  return s;
}
function assertOutcome(o) {
  if (o !== undefined && !TREATMENT_OUTCOMES.includes(o)) throw new ApiError(400, 'Invalid treatment outcome.');
  return o;
}
function assertTransition(from, to) {
  if (from === to) return;
  if (!(RECORD_TRANSITIONS[from] || []).includes(to)) {
    throw new ApiError(400, `Invalid treatment record status transition: ${from} → ${to}.`);
  }
}

async function assertPatient(patientId) {
  if (!patientId) throw new ApiError(400, 'Patient is required.');
  const patient = await Patient.findById(patientId);
  if (!patient) throw new ApiError(404, 'Patient not found');
  return patient;
}

function assertTooth(n) {
  if (n === undefined || n === null || n === '' || Number(n) === 0) {
    return { hasTooth: false, toothNumber: 0 };
  }
  const num = Number(n);
  if (!Number.isInteger(num) || !TOOTH_NUMBER_SET.has(num)) {
    throw new ApiError(400, 'Invalid tooth number. Use a valid FDI permanent tooth number (11-18, 21-28, 31-38, 41-48).');
  }
  return { hasTooth: true, toothNumber: num };
}

function sanitizeMaterials(m) {
  return (m || []).map((x) => {
    const d = x && x.toObject ? x.toObject() : x;
    return { id: d._id, name: d.name || '', quantity: d.quantity || '', notes: d.notes || '' };
  });
}

function sanitize(doc) {
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    id: d._id,
    recordNumber: d.recordNumber,
    patient: d.patient,
    visit: d.visit,
    consultation: d.consultation,
    doctor: d.doctor,
    treatmentPlan: d.treatmentPlan,
    treatmentPlanItem: d.treatmentPlanItem,
    diagnosis: d.diagnosis,
    toothNumber: d.toothNumber,
    hasTooth: !!d.hasTooth,
    procedure: d.procedure,
    procedureDate: d.procedureDate,
    startTime: d.startTime || '',
    endTime: d.endTime || '',
    findings: d.findings || '',
    notes: d.notes || '',
    materials: sanitizeMaterials(d.materials),
    anesthesia: d.anesthesia || { used: false, type: '', amount: '', notes: '' },
    complications: d.complications || '',
    outcome: d.outcome || 'successful',
    outcomeNotes: d.outcomeNotes || '',
    status: d.status,
    followUpRecommended: !!d.followUpRecommended,
    followUpDays: d.followUpDays ?? null,
    startedAt: d.startedAt,
    completedAt: d.completedAt,
    cancelledAt: d.cancelledAt,
    cancelReason: d.cancelReason || '',
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

const baseQuery = (id) =>
  TreatmentRecord.findOne({ _id: id, isArchived: false })
    .populate('patient', 'firstName lastName patientId gender phone dob')
    .populate('doctor', 'name')
    .populate('startedBy', 'name')
    .populate('completedBy', 'name')
    .populate('cancelledBy', 'name')
    .populate('visit', 'opNumber')
    .populate('consultation', 'status')
    .populate('treatmentPlan', 'planNumber name status')
    .populate('diagnosis', 'name category toothNumber');

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
      throw new ApiError(400, 'Diagnosis reference must belong to the treatment patient.');
    }
  }
  let plan = null;
  let planItem = null;
  if (payload.treatmentPlanId) {
    plan = await TreatmentPlan.findOne({ _id: payload.treatmentPlanId, isArchived: false });
    if (!plan) throw new ApiError(404, 'Treatment plan not found');
    if (String(plan.patient) !== String(patientId)) {
      throw new ApiError(400, 'Treatment plan must belong to the treatment patient.');
    }
    if (payload.treatmentPlanItemId) {
      planItem = plan.items.id(payload.treatmentPlanItemId);
      if (!planItem) throw new ApiError(404, 'Treatment plan item not found in the plan.');
    }
  } else if (payload.treatmentPlanItemId) {
    throw new ApiError(400, 'treatmentPlanItemId requires a treatmentPlanId.');
  }
  return { visit, consultation, diagnosis, plan, planItem };
}

// Sync the treatment plan item (intent) status + recompute plan-level status.
async function syncPlanItem({ plan, planItem, recordStatus, actor }) {
  const desired = ITEM_STATUS_BY_RECORD[recordStatus];
  if (desired && desired !== planItem.status) {
    planItem.status = desired;
  }
  // Recompute plan-level status from its items.
  const statuses = (plan.items || []).map((i) => i.status);
  const anyActive = statuses.some((s) => s === 'in-progress' || s === 'partially-completed');
  const allComplete = statuses.every((s) => s === 'completed' || s === 'cancelled');
  let planStatus = plan.status;
  if (allComplete && statuses.length > 0) planStatus = 'completed';
  else if (anyActive) planStatus = 'in-progress';
  else if (statuses.some((s) => s === 'completed')) planStatus = 'partially-completed';
  if (planStatus !== plan.status) plan.status = planStatus;
  await plan.save();
  await recordAudit({
    user: actor,
    action: 'update',
    entity: 'treatment-plan',
    entityId: plan._id,
    description: `Plan ${plan.planNumber}: item ${planItem.procedure} → ${planItem.status} (synced from treatment execution)`,
    meta: { patient: plan.patient, planNumber: plan.planNumber, procedure: planItem.procedure, itemStatus: planItem.status, planStatus: plan.status },
  });
}

// Append to the permanent tooth-history store (reuses Step 7 architecture).
async function syncToothHistory(doc, actor) {
  if (!doc.hasTooth || !doc.toothNumber) return;
  const payload = {
    procedure: doc.procedure,
    status: 'completed',
    charges: 0,
    notes: doc.notes || doc.findings || '',
    date: doc.procedureDate || new Date(),
  };
  if (doc.visit && doc.visit._id) payload.visitId = doc.visit._id;
  if (doc.consultation && doc.consultation._id) payload.consultationId = doc.consultation._id;
  await toothChartService.addTreatment(doc.patient, doc.toothNumber, payload, actor);
}

async function create(payload, actor) {
  const patient = await assertPatient(payload.patientId);
  const doctor = await User.findById(actor._id);
  if (!doctor || !['doctor', 'admin'].includes(doctor.role)) throw new ApiError(400, 'A valid doctor is required');

  const { visit, consultation, diagnosis, plan, planItem } = await resolveRefs(payload, patient._id);
  const tooth = assertTooth(payload.toothNumber);
  const status = assertStatus(payload.status || 'in-progress');
  if (!payload.procedure || !String(payload.procedure).trim()) {
    throw new ApiError(400, 'Procedure is required');
  }
  const isStarted = status === 'in-progress' || status === 'partially-completed';
  const isCompleted = status === 'completed';

  const doc = await TreatmentRecord.create({
    recordNumber: await nextTreatmentRecordNumber(),
    patient: patient._id,
    visit: visit ? visit._id : null,
    consultation: consultation ? consultation._id : null,
    doctor: doctor._id,
    treatmentPlan: plan ? plan._id : null,
    treatmentPlanItem: planItem ? planItem._id : undefined,
    diagnosis: diagnosis ? diagnosis._id : null,
    toothNumber: tooth.toothNumber,
    hasTooth: tooth.hasTooth,
    procedure: String(payload.procedure).trim(),
    procedureDate: payload.procedureDate || new Date(),
    startTime: payload.startTime || '',
    endTime: payload.endTime || '',
    findings: payload.findings || '',
    notes: payload.notes || '',
    materials: Array.isArray(payload.materials) ? payload.materials.map((m) => ({ name: m.name || '', quantity: m.quantity || '', notes: m.notes || '' })) : [],
    anesthesia: payload.anesthesia || {},
    complications: payload.complications || '',
    outcome: assertOutcome(payload.outcome) || 'successful',
    outcomeNotes: payload.outcomeNotes || '',
    status,
    followUpRecommended: !!payload.followUpRecommended,
    followUpDays: payload.followUpDays ?? null,
    startedAt: isStarted ? new Date() : undefined,
    startedBy: isStarted ? actor._id : undefined,
    completedAt: isCompleted ? new Date() : undefined,
    completedBy: isCompleted ? actor._id : undefined,
  });

  await recordAudit({
    user: actor,
    action: 'create',
    entity: 'treatment-record',
    entityId: doc._id,
    description: `Treatment record ${doc.recordNumber} created: ${doc.procedure}`,
    meta: { patient: patient._id, toothNumber: doc.toothNumber, procedure: doc.procedure, status: doc.status, opNumber: visit ? visit.opNumber : undefined },
  });

  if ((status === 'in-progress' || status === 'partially-completed') && plan && planItem) {
    await syncPlanItem({ plan, planItem, recordStatus: status, actor });
  }
  if (status === 'completed') {
    if (plan && planItem) await syncPlanItem({ plan, planItem, recordStatus: 'completed', actor });
    if (doc.hasTooth) await syncToothHistory(doc, actor);
    await recordAudit({
      user: actor,
      action: 'complete',
      entity: 'treatment-record',
      entityId: doc._id,
      description: `Treatment ${doc.procedure} completed (${doc.recordNumber})`,
      meta: { patient: patient._id, toothNumber: doc.toothNumber, procedure: doc.procedure, opNumber: visit ? visit.opNumber : undefined },
    });
  }

  return sanitize(await baseQuery(doc._id));
}

async function get(id, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Treatment record not found');
  return sanitize(doc);
}

async function update(id, payload, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Treatment record not found');
  if (doc.status === 'completed' && payload.status !== 'completed') {
    throw new ApiError(409, 'A completed treatment record cannot be reopened.');
  }

  if (payload.procedure !== undefined) {
    if (!String(payload.procedure).trim()) throw new ApiError(400, 'Procedure is required');
    doc.procedure = String(payload.procedure).trim();
  }
  if (payload.procedureDate !== undefined) doc.procedureDate = payload.procedureDate;
  if (payload.startTime !== undefined) doc.startTime = payload.startTime;
  if (payload.endTime !== undefined) doc.endTime = payload.endTime;
  if (payload.findings !== undefined) doc.findings = payload.findings;
  if (payload.notes !== undefined) doc.notes = payload.notes;
  if (payload.complications !== undefined) doc.complications = payload.complications;
  if (payload.outcome !== undefined) doc.outcome = assertOutcome(payload.outcome);
  if (payload.outcomeNotes !== undefined) doc.outcomeNotes = payload.outcomeNotes;
  if (payload.followUpRecommended !== undefined) doc.followUpRecommended = !!payload.followUpRecommended;
  if (payload.followUpDays !== undefined) doc.followUpDays = payload.followUpDays;
  if (payload.materials !== undefined) {
    doc.materials = payload.materials.map((m) => ({ name: m.name || '', quantity: m.quantity || '', notes: m.notes || '' }));
  }
  if (payload.anesthesia !== undefined) {
    const a = payload.anesthesia || {};
    doc.anesthesia = { used: !!a.used, type: a.type || '', amount: a.amount || '', notes: a.notes || '' };
  }
  if (payload.toothNumber !== undefined) {
    const tooth = assertTooth(payload.toothNumber);
    doc.hasTooth = tooth.hasTooth;
    doc.toothNumber = tooth.toothNumber;
  }

  if (payload.status !== undefined) {
    const next = assertStatus(payload.status);
    assertTransition(doc.status, next);
    if (next === 'completed') doc.completedAt = new Date();
    if (next === 'completed') doc.completedBy = actor._id;
    if (next === 'deferred' || next === 'cancelled') {
      doc.cancelledAt = doc.cancelledAt || new Date();
      doc.cancelledBy = doc.cancelledBy || actor._id;
      doc.cancelReason = payload.cancelReason ? String(payload.cancelReason).trim() : doc.cancelReason;
    }
    doc.status = next;
  }

  await doc.save();

  // Sync plan item + write tooth history when completing.
  if (doc.treatmentPlan && doc.treatmentPlanItem) {
    const plan = await TreatmentPlan.findById(doc.treatmentPlan);
    if (plan) {
      const planItem = plan.items.id(doc.treatmentPlanItem);
      if (planItem) await syncPlanItem({ plan, planItem, recordStatus: doc.status, actor });
    }
  }
  if (doc.status === 'completed' && doc.hasTooth) {
    await syncToothHistory(doc, actor);
  }

  await recordAudit({
    user: actor,
    action: 'update',
    entity: 'treatment-record',
    entityId: doc._id,
    description: `Treatment record ${doc.recordNumber} → ${doc.status}`,
    meta: { patient: doc.patient, toothNumber: doc.toothNumber, procedure: doc.procedure, status: doc.status },
  });

  return sanitize(await baseQuery(id));
}

async function complete(id, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Treatment record not found');
  if (doc.status === 'completed') throw new ApiError(400, 'Treatment is already completed.');
  assertTransition(doc.status, 'completed');

  doc.status = 'completed';
  doc.completedAt = new Date();
  doc.completedBy = actor._id;
  await doc.save();

  if (doc.treatmentPlan && doc.treatmentPlanItem) {
    const plan = await TreatmentPlan.findById(doc.treatmentPlan);
    if (plan) {
      const planItem = plan.items.id(doc.treatmentPlanItem);
      if (planItem) await syncPlanItem({ plan, planItem, recordStatus: 'completed', actor });
    }
  }
  await syncToothHistory(doc, actor);

  await recordAudit({
    user: actor,
    action: 'complete',
    entity: 'treatment-record',
    entityId: doc._id,
    description: `Treatment ${doc.procedure} completed (${doc.recordNumber})`,
    meta: { patient: doc.patient, toothNumber: doc.toothNumber, procedure: doc.procedure, opNumber: doc.visit?.opNumber },
  });

  return sanitize(await baseQuery(id));
}

async function cancel(id, payload, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Treatment record not found');
  if (doc.status === 'completed' || doc.status === 'cancelled') throw new ApiError(409, 'Treatment record is already closed.');
  assertTransition(doc.status, 'cancelled');
  doc.status = 'cancelled';
  doc.cancelledAt = new Date();
  doc.cancelledBy = actor._id;
  doc.cancelReason = payload && payload.reason ? String(payload.reason).trim() : '';
  await doc.save();

  await recordAudit({
    user: actor,
    action: 'cancel',
    entity: 'treatment-record',
    entityId: doc._id,
    description: `Treatment ${doc.procedure} cancelled (${doc.recordNumber})`,
    meta: { patient: doc.patient, toothNumber: doc.toothNumber, procedure: doc.procedure },
  });

  return sanitize(await baseQuery(id));
}

async function listByPatient(patientId, actor) {
  await assertPatient(patientId);
  const docs = await TreatmentRecord.find({ patient: patientId, isArchived: false })
    .sort({ procedureDate: -1 })
    .populate('doctor', 'name')
    .populate('visit', 'opNumber')
    .populate('consultation', 'status')
    .populate('treatmentPlan', 'planNumber name status')
    .populate('diagnosis', 'name category toothNumber');
  return docs.map(sanitize);
}

async function listByConsultation(consultationId, actor) {
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) throw new ApiError(404, 'Consultation not found');
  const docs = await TreatmentRecord.find({ consultation: consultationId, isArchived: false })
    .sort({ procedureDate: -1 })
    .populate('doctor', 'name')
    .populate('visit', 'opNumber')
    .populate('treatmentPlan', 'planNumber name status')
    .populate('diagnosis', 'name category toothNumber');
  return docs.map(sanitize);
}

async function listByPlan(planId, actor) {
  const plan = await TreatmentPlan.findById(planId);
  if (!plan) throw new ApiError(404, 'Treatment plan not found');
  const docs = await TreatmentRecord.find({ treatmentPlan: planId, isArchived: false })
    .sort({ procedureDate: -1 })
    .populate('doctor', 'name')
    .populate('visit', 'opNumber')
    .populate('consultation', 'status')
    .populate('treatmentPlan', 'planNumber name status')
    .populate('diagnosis', 'name category toothNumber');
  return docs.map(sanitize);
}

module.exports = {
  create,
  get,
  update,
  complete,
  cancel,
  listByPatient,
  listByConsultation,
  listByPlan,
};