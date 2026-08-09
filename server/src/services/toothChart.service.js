const { PatientTooth, TOOTH_NUMBER_SET, TOOTH_CONDITIONS, TOOTH_TREATMENT_STATUSES } = require('../models/PatientTooth');
const Patient = require('../models/Patient');
const { Visit } = require('../models/Visit');
const { Consultation } = require('../models/Consultation');
const { recordAudit } = require('../utils/audit');
const ApiError = require('../utils/ApiError');

function assertToothNumber(toothNumber) {
  const num = Number(toothNumber);
  if (!Number.isInteger(num) || !TOOTH_NUMBER_SET.has(num)) {
    throw new ApiError(400, 'Invalid tooth number. Use a valid FDI permanent tooth number (11-18, 21-28, 31-38, 41-48).');
  }
  return num;
}

function assertCondition(condition) {
  if (!condition || !TOOTH_CONDITIONS.includes(condition)) {
    throw new ApiError(400, 'Invalid condition. Choose from the supported clinical conditions.');
  }
  return condition;
}

function assertTreatmentStatus(status) {
  if (!status || !TOOTH_TREATMENT_STATUSES.includes(status)) {
    throw new ApiError(400, 'Invalid treatment status.');
  }
  return status;
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

const toId = (value) => {
  if (value === null || value === undefined) return value;
  try {
    return String(value && value._id ? value._id : value);
  } catch {
    return '';
  }
};

const refName = (ref) => {
  if (!ref) return null;
  if (typeof ref === 'object' && ref.name) return ref.name;
  if (typeof ref === 'object' && ref.opNumber) return ref.opNumber;
  return null;
};

const procName = (ref) => {
  if (!ref) return null;
  if (typeof ref === 'object' && ref.name) return ref.name;
  if (typeof ref === 'object' && ref.condition) return ref.condition;
  return null;
};

function buildTimeline(d) {
  const events = [];
  for (const f of d.findings || []) {
    events.push({
      id: toId(f._id),
      type: 'finding',
      date: f.date,
      title: f.condition || 'Finding',
      status: null,
      description: f.findings || '',
      notes: f.notes || '',
      doctor: procName(f.doctor),
      visit: refName(f.visit),
      consultation: toId(f.consultation && f.consultation._id),
    });
  }
  for (const t of d.treatments || []) {
    events.push({
      id: toId(t._id),
      type: 'treatment',
      date: t.date,
      title: t.procedure || 'Treatment',
      status: t.status,
      description: '',
      notes: t.notes || '',
      charges: t.charges ?? 0,
      doctor: procName(t.doctor),
      visit: refName(t.visit),
      consultation: toId(t.consultation && t.consultation._id),
    });
  }
  events.sort((a, b) => new Date(a.date) - new Date(b.date) || new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  return events;
}

// Populated query so refs serialize as healthy sub-documents (avoids detached-ObjectId bson errors).
function baseQuery(patientId, toothNumber) {
  return PatientTooth.findOne({ patient: patientId, toothNumber, isArchived: false })
    .populate('findings.doctor', 'name')
    .populate('treatments.doctor', 'name')
    .populate('findings.visit', 'opNumber')
    .populate('treatments.visit', 'opNumber')
    .populate('findings.consultation', 'status')
    .populate('treatments.consultation', 'status');
}

function summarize(tooth) {
  const d = tooth.toObject ? tooth.toObject() : tooth;
  const treatments = d.treatments || [];
  const completed = treatments
    .filter((t) => t.status === 'completed')
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const planned = treatments
    .filter((t) => ['planned', 'started', 'in-progress'].includes(t.status))
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  return {
    id: toId(d._id),
    toothNumber: d.toothNumber,
    currentStatus: d.currentStatus,
    isMissing: !!d.isMissing,
    notes: d.notes || '',
    findingsCount: (d.findings || []).length,
    treatmentsCount: treatments.length,
    latestTreatment: completed ? { date: completed.date, procedure: completed.procedure } : null,
    nextTreatment: planned ? { date: planned.date, procedure: planned.procedure, status: planned.status } : null,
    updatedAt: d.updatedAt,
  };
}

function detail(tooth) {
  const d = tooth.toObject ? tooth.toObject() : tooth;
  return {
    id: toId(d._id),
    toothNumber: d.toothNumber,
    currentStatus: d.currentStatus,
    isMissing: !!d.isMissing,
    notes: d.notes || '',
    findings: (d.findings || []).map((f) => ({
      id: toId(f._id),
      date: f.date,
      condition: f.condition,
      findings: f.findings || '',
      notes: f.notes || '',
      doctor: procName(f.doctor),
      visit: refName(f.visit),
      consultation: toId(f.consultation && f.consultation._id),
      createdAt: f.createdAt,
    })),
    treatments: (d.treatments || []).map((t) => ({
      id: toId(t._id),
      date: t.date,
      procedure: t.procedure,
      status: t.status,
      charges: t.charges ?? 0,
      notes: t.notes || '',
      doctor: procName(t.doctor),
      visit: refName(t.visit),
      consultation: toId(t.consultation && t.consultation._id),
      createdAt: t.createdAt,
    })),
    timeline: buildTimeline(d),
    updatedAt: d.updatedAt,
  };
}

function defaultTooth(toothNumber) {
  return {
    id: null,
    toothNumber,
    currentStatus: 'healthy',
    isMissing: false,
    notes: '',
    findings: [],
    treatments: [],
    timeline: [],
    updatedAt: null,
  };
}

async function listToothChart(patientId, actor) {
  await assertPatient(patientId);
  const teeth = await PatientTooth.find({ patient: patientId, isArchived: false }).sort({ toothNumber: 1 });
  return { items: teeth.map((t) => summarize(t)), total: teeth.length };
}

async function getTooth(patientId, toothNumber, actor) {
  await assertPatient(patientId);
  const num = assertToothNumber(toothNumber);
  const tooth = await baseQuery(patientId, num);
  return tooth ? detail(tooth) : defaultTooth(num);
}

async function getToothHistory(patientId, toothNumber, actor) {
  await assertPatient(patientId);
  const num = assertToothNumber(toothNumber);
  const tooth = await baseQuery(patientId, num);
  if (!tooth) return defaultTooth(num);
  return detail(tooth);
}

function deriveConditionForTreatment(procedure) {
  const p = String(procedure || '').toLowerCase();
  if (p.includes('extraction') || p.includes('remove')) return 'missing';
  if (p.includes('implant')) return 'implant';
  if (p.includes('crown')) return 'crown';
  if (p.includes('root canal') || p.includes('rct')) return 'rct';
  if (p.includes('filling') || p.includes('composite') || p.includes('restoration')) return 'filling';
  if (p.includes('bridge')) return 'bridge';
  return null;
}

async function upsertTooth(patientId, toothNumber) {
  return PatientTooth.findOneAndUpdate(
    { patient: patientId, toothNumber, isArchived: false },
    { $setOnInsert: { patient: patientId, toothNumber, currentStatus: 'healthy' } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function addFinding(patientId, toothNumber, payload, actor) {
  await assertPatient(patientId);
  const num = assertToothNumber(toothNumber);
  const condition = assertCondition(payload.condition);
  const { visit, consultation } = await resolveRefs(payload);

  const tooth = await upsertTooth(patientId, num);
  tooth.findings.push({
    date: payload.date || new Date(),
    condition,
    findings: payload.findings || '',
    notes: payload.notes || '',
    doctor: actor._id,
    visit: visit ? visit._id : null,
    consultation: consultation ? consultation._id : null,
  });
  tooth.currentStatus = condition;
  if (condition === 'missing') tooth.isMissing = true;
  await tooth.save();

  await recordAudit({
    user: actor,
    action: 'create',
    entity: 'tooth-chart',
    entityId: tooth._id,
    description: `Tooth ${num} finding: ${condition}`,
    meta: { toothNumber: num, condition, patient: patientId },
  });

  const fresh = await baseQuery(patientId, num);
  return detail(fresh);
}

async function addTreatment(patientId, toothNumber, payload, actor) {
  await assertPatient(patientId);
  const num = assertToothNumber(toothNumber);
  const status = assertTreatmentStatus(payload.status || 'completed');
  if (!payload.procedure || !String(payload.procedure).trim()) {
    throw new ApiError(400, 'Procedure is required');
  }
  const { visit, consultation } = await resolveRefs(payload);

  const tooth = await upsertTooth(patientId, num);
  tooth.treatments.push({
    date: payload.date || new Date(),
    procedure: String(payload.procedure).trim(),
    status,
    charges: Number(payload.charges) || 0,
    notes: payload.notes || '',
    doctor: actor._id,
    visit: visit ? visit._id : null,
    consultation: consultation ? consultation._id : null,
  });
  if (status === 'completed') {
    const derived = deriveConditionForTreatment(payload.procedure);
    if (derived) {
      tooth.currentStatus = derived;
      if (derived === 'missing') tooth.isMissing = true;
    }
  }
  await tooth.save();

  await recordAudit({
    user: actor,
    action: 'create',
    entity: 'tooth-chart',
    entityId: tooth._id,
    description: `Tooth ${num} treatment: ${payload.procedure}`,
    meta: { toothNumber: num, procedure: payload.procedure, status, patient: patientId },
  });

  const fresh = await baseQuery(patientId, num);
  return detail(fresh);
}

async function updateTooth(patientId, toothNumber, payload, actor) {
  await assertPatient(patientId);
  const num = assertToothNumber(toothNumber);
  const tooth = await upsertTooth(patientId, num);

  if (payload.currentStatus !== undefined) {
    tooth.currentStatus = assertCondition(payload.currentStatus);
  }
  if (payload.isMissing !== undefined) tooth.isMissing = !!payload.isMissing;
  if (payload.notes !== undefined) tooth.notes = String(payload.notes).trim();
  await tooth.save();

  await recordAudit({
    user: actor,
    action: 'update',
    entity: 'tooth-chart',
    entityId: tooth._id,
    description: `Tooth ${num} updated`,
    meta: { toothNumber: num, currentStatus: tooth.currentStatus, patient: patientId },
  });

  const fresh = await baseQuery(patientId, num);
  return detail(fresh);
}

module.exports = {
  listToothChart,
  getTooth,
  getToothHistory,
  addFinding,
  addTreatment,
  updateTooth,
};