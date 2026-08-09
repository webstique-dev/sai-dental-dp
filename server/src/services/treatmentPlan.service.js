const TreatmentPlan = require('../models/TreatmentPlan');
const { PLAN_STATUSES, PLAN_ITEM_STATUSES, PLAN_PRIORITIES } = TreatmentPlan;
const Diagnosis = require('../models/Diagnosis');
const { DIAGNOSIS_CATEGORIES, DIAGNOSIS_STATUSES } = Diagnosis;
const Patient = require('../models/Patient');
const { Visit } = require('../models/Visit');
const { Consultation } = require('../models/Consultation');
const { TOOTH_NUMBER_SET } = require('../models/PatientTooth');
const { nextTreatmentPlanNumber } = require('../models/Counter');
const { recordAudit } = require('../utils/audit');
const ApiError = require('../utils/ApiError');

// Allowed plan status transitions (guarded; terminal states cannot regress).
const PLAN_TRANSITIONS = {
  draft: ['proposed', 'approved', 'cancelled', 'declined'],
  proposed: ['draft', 'approved', 'declined', 'cancelled'],
  approved: ['in-progress', 'partially-completed', 'completed', 'cancelled'],
  'in-progress': ['partially-completed', 'completed', 'cancelled'],
  'partially-completed': ['in-progress', 'completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const ITEM_TRANSITIONS = {
  planned: ['scheduled', 'in-progress', 'cancelled', 'deferred'],
  scheduled: ['in-progress', 'completed', 'planned', 'cancelled', 'deferred'],
  'in-progress': ['completed', 'planned', 'cancelled', 'deferred'],
  completed: [],
  deferred: ['planned', 'scheduled', 'in-progress', 'cancelled'],
  cancelled: [],
};

function assertPlanStatus(status) {
  if (!PLAN_STATUSES.includes(status)) throw new ApiError(400, 'Invalid treatment plan status.');
  return status;
}
function assertItemStatus(status) {
  if (!PLAN_ITEM_STATUSES.includes(status)) throw new ApiError(400, 'Invalid plan item status.');
  return status;
}
function assertPriority(priority) {
  if (!PLAN_PRIORITIES.includes(priority)) throw new ApiError(400, 'Invalid priority.');
  return priority;
}

function assertTooth(number) {
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

async function assertDiagnosisRef(diagnosisId, patientId) {
  if (!diagnosisId) return null;
  const diagnosis = await Diagnosis.findById(diagnosisId);
  if (!diagnosis || String(diagnosis.patient) !== String(patientId)) {
    throw new ApiError(400, 'Diagnosis reference must belong to the plan patient.');
  }
  return diagnosis;
}

function sanitizeItem(item) {
  const i = item && item.toObject ? item.toObject() : item;
  return {
    id: (i && i._id) ? i._id : undefined,
    procedure: i.procedure,
    toothNumber: i.toothNumber,
    hasTooth: !!i.hasTooth,
    description: i.description || '',
    priority: i.priority,
    estimatedCost: i.estimatedCost ?? 0,
    plannedDate: i.plannedDate,
    status: i.status,
    diagnosis: i.diagnosis,
    notes: i.notes || '',
    sortOrder: i.sortOrder ?? 0,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  };
}

function sanitize(doc) {
  const d = doc.toObject ? doc.toObject() : doc;
  const items = (d.items || [])
    .filter((it) => !it._isDeleted)
    .map(sanitizeItem)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const total =
    items.filter((it) => it.status !== 'cancelled').reduce((sum, it) => sum + (Number(it.estimatedCost) || 0), 0) || 0;
  return {
    id: d._id,
    planNumber: d.planNumber,
    patient: d.patient,
    consultation: d.consultation,
    visit: d.visit,
    doctor: d.doctor,
    name: d.name || '',
    status: d.status,
    proposedAt: d.proposedAt,
    approvedAt: d.approvedAt,
    declinedAt: d.declinedAt,
    approvedBy: d.approvedBy,
    declineReason: d.declineReason || '',
    notes: d.notes || '',
    items,
    estimatedTotal: total,
    itemCount: items.length,
    activeItemCount: items.filter((it) => ['planned', 'scheduled', 'in-progress'].includes(it.status)).length,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

const baseQuery = (id) =>
  TreatmentPlan.findOne({ _id: id, isArchived: false })
    .populate('doctor', 'name')
    .populate('approvedBy', 'name')
    .populate('visit', 'opNumber')
    .populate('consultation', 'status')
    .populate('items.diagnosis', 'name category toothNumber');

function ensurePlanEditable(plan) {
  if (['completed', 'cancelled'].includes(plan.status)) {
    throw new ApiError(409, 'Cannot modify a completed or cancelled plan.');
  }
}

function assertTransition(transitions, from, to) {
  if (from === to) return;
  if (!(transitions[from] || []).includes(to)) {
    throw new ApiError(400, `Invalid status transition: ${from} → ${to}.`);
  }
}

function applyTransitionTimestamps(plan, next, actor) {
  const now = new Date();
  if (next === 'proposed') plan.proposedAt = plan.proposedAt || now;
  if (next === 'approved') {
    plan.approvedAt = now;
    plan.approvedBy = actor._id;
  }
  if (next === 'declined') plan.declinedAt = now;
}

function validateItem(item, patientId) {
  if (!item || !String(item.procedure || '').trim()) {
    throw new ApiError(400, 'Each plan item requires a procedure.');
  }
  const tooth = assertTooth(item.toothNumber);
  const toothData = { hasTooth: tooth.hasTooth, toothNumber: tooth.toothNumber };
  return {
    procedure: String(item.procedure).trim(),
    ...toothData,
    description: item.description || '',
    priority: assertPriority(item.priority || 'medium'),
    estimatedCost: Math.round((Number(item.estimatedCost) || 0) * 100) / 100,
    plannedDate: item.plannedDate || undefined,
    status: assertItemStatus(item.status || 'planned'),
    notes: item.notes || '',
    sortOrder: Number(item.sortOrder) || 0,
    diagnosis: item.diagnosisId || item.diagnosis || undefined,
  };
}

async function create(payload, actor) {
  const patient = await assertPatient(payload.patientId);
  const { visit, consultation } = await resolveRefs(payload);
  const planNumber = await nextTreatmentPlanNumber();

  const doc = await TreatmentPlan.create({
    planNumber,
    patient: patient._id,
    visit: visit ? visit._id : null,
    consultation: consultation ? consultation._id : null,
    doctor: actor._id,
    name: payload.name ? String(payload.name).trim() : '',
    status: 'draft',
    notes: payload.notes || '',
  });

  // Add items atomically within the same request if provided.
  if (Array.isArray(payload.items) && payload.items.length) {
    for (const raw of payload.items) {
      const next = validateItem(raw, patient._id);
      const diagnosis = await assertDiagnosisRef(next.diagnosis, patient._id);
      next.diagnosis = diagnosis ? diagnosis._id : undefined;
      doc.items.push(next);
    }
    await doc.save();
  }

  await recordAudit({
    user: actor,
    action: 'create',
    entity: 'treatment-plan',
    entityId: doc._id,
    description: `Treatment plan ${planNumber} created (${doc.items.length} item${doc.items.length === 1 ? '' : 's'})`,
    meta: { patient: patient._id, consultation: consultation ? consultation._id : undefined, planNumber },
  });

  return sanitize(await baseQuery(doc._id));
}

async function listByPatient(patientId, actor) {
  await assertPatient(patientId);
  const docs = await TreatmentPlan.find({ patient: patientId, isArchived: false })
    .sort({ createdAt: -1 })
    .populate('doctor', 'name')
    .populate('approvedBy', 'name')
    .populate('visit', 'opNumber')
    .populate('consultation', 'status')
    .populate('items.diagnosis', 'name category toothNumber');
  return docs.map(sanitize);
}

async function get(id, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Treatment plan not found');
  return sanitize(doc);
}

async function update(id, payload, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Treatment plan not found');
  ensurePlanEditable(doc);

  if (payload.name !== undefined) doc.name = String(payload.name).trim();
  if (payload.notes !== undefined) doc.notes = payload.notes;

  if (payload.status !== undefined) {
    const next = assertPlanStatus(payload.status);
    assertTransition(PLAN_TRANSITIONS, doc.status, next);
    applyTransitionTimestamps(doc, next, actor);
    doc.status = next;
  }

  await doc.save();

  await recordAudit({
    user: actor,
    action: 'update',
    entity: 'treatment-plan',
    entityId: doc._id,
    description: `Plan ${doc.planNumber} → ${doc.status}`,
    meta: { patient: doc.patient, planNumber: doc.planNumber, status: doc.status },
  });

  return sanitize(await baseQuery(id));
}

async function addItem(id, payload, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Treatment plan not found');
  ensurePlanEditable(doc);
  const item = validateItem(payload, doc.patient);
  const diagnosis = await assertDiagnosisRef(item.diagnosis, doc.patient);
  item.diagnosis = diagnosis ? diagnosis._id : undefined;

  doc.items.push(item);
  await doc.save();

  await recordAudit({
    user: actor,
    action: 'update',
    entity: 'treatment-plan',
    entityId: doc._id,
    description: `Plan ${doc.planNumber}: added ${item.procedure}`,
    meta: { patient: doc.patient, planNumber: doc.planNumber, procedure: item.procedure },
  });

  return sanitize(await baseQuery(id));
}

async function updateItem(planId, itemId, payload, actor) {
  const doc = await baseQuery(planId);
  if (!doc) throw new ApiError(404, 'Treatment plan not found');
  ensurePlanEditable(doc);

  const item = doc.items.id(itemId);
  if (!item) throw new ApiError(404, 'Plan item not found');

  if (payload.procedure !== undefined) {
    if (!String(payload.procedure).trim()) throw new ApiError(400, 'Procedure is required');
    item.procedure = String(payload.procedure).trim();
  }
  if (payload.priority !== undefined) item.priority = assertPriority(payload.priority);
  if (payload.estimatedCost !== undefined) item.estimatedCost = Math.max(0, Number(payload.estimatedCost) || 0);
  if (payload.description !== undefined) item.description = payload.description;
  if (payload.notes !== undefined) item.notes = payload.notes;
  if (payload.plannedDate !== undefined) item.plannedDate = payload.plannedDate || null;
  if (payload.sortOrder !== undefined) item.sortOrder = Number(payload.sortOrder) || 0;
  if (payload.toothNumber !== undefined) {
    const tooth = assertTooth(payload.toothNumber);
    item.hasTooth = tooth.hasTooth;
    item.toothNumber = tooth.toothNumber;
  }
  if (payload.status !== undefined) {
    const next = assertItemStatus(payload.status);
    assertTransition(ITEM_TRANSITIONS, item.status, next);
    item.status = next;
  }

  await doc.save();

  await recordAudit({
    user: actor,
    action: 'update',
    entity: 'treatment-plan',
    entityId: doc._id,
    description: `Plan ${doc.planNumber}: item ${item.procedure} → ${item.status}`,
    meta: { patient: doc.patient, planNumber: doc.planNumber, procedure: item.procedure, itemStatus: item.status },
  });

  return sanitize(await baseQuery(planId));
}

async function removeItem(planId, itemId, actor) {
  const doc = await baseQuery(planId);
  if (!doc) throw new ApiError(404, 'Treatment plan not found');
  ensurePlanEditable(doc);

  const item = doc.items.id(itemId);
  if (!item) throw new ApiError(404, 'Plan item not found');
  doc.items.pull(item);
  await doc.save();

  await recordAudit({
    user: actor,
    action: 'update',
    entity: 'treatment-plan',
    entityId: doc._id,
    description: `Plan ${doc.planNumber}: removed item ${item.procedure}`,
    meta: { patient: doc.patient, planNumber: doc.planNumber },
  });

  return sanitize(await baseQuery(planId));
}

async function approve(id, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Treatment plan not found');
  if (['completed', 'cancelled'].includes(doc.status)) throw new ApiError(409, 'Plan is already closed.');
  assertTransition(PLAN_TRANSITIONS, doc.status, 'approved');
  doc.status = 'approved';
  doc.approvedAt = new Date();
  doc.approvedBy = actor._id;
  doc.proposedAt = doc.proposedAt || new Date();
  await doc.save();

  await recordAudit({
    user: actor,
    action: 'approve',
    entity: 'treatment-plan',
    entityId: doc._id,
    description: `Plan ${doc.planNumber} approved`,
    meta: { patient: doc.patient, planNumber: doc.planNumber },
  });

  return sanitize(await baseQuery(id));
}

async function decline(id, reason, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Treatment plan not found');
  if (['completed', 'cancelled'].includes(doc.status)) throw new ApiError(409, 'Plan is terminal.');
  assertTransition(PLAN_TRANSITIONS, doc.status, 'declined');
  doc.status = 'declined';
  doc.declinedAt = new Date();
  doc.declineReason = reason ? String(reason).trim() : '';
  await doc.save();

  await recordAudit({
    user: actor,
    action: 'decline',
    entity: 'treatment-plan',
    entityId: doc._id,
    description: `Plan ${doc.planNumber} declined`,
    meta: { patient: doc.patient, planNumber: doc.planNumber, reason: doc.declineReason },
  });

  return sanitize(await baseQuery(id));
}

module.exports = {
  create,
  update,
  addItem,
  updateItem,
  removeItem,
  listByPatient,
  get,
  approve,
  decline,
};