const Prescription = require('../models/Prescription');
const {
  PRESCRIPTION_STATUSES,
  PRESCRIPTION_FREQUENCIES,
  DURATION_UNITS,
  ROUTES,
  FOOD_INSTRUCTIONS,
} = Prescription;
const Diagnosis = require('../models/Diagnosis');
const Patient = require('../models/Patient');
const { Visit } = require('../models/Visit');
const { Consultation } = require('../models/Consultation');
const { User } = require('../models/User');
const { nextPrescriptionNumber } = require('../models/Counter');
const { recordAudit } = require('../utils/audit');
const ApiError = require('../utils/ApiError');

// Prescription status transitions (guarded; dispensed/issued cannot silently return to draft).
const TRANSITIONS = {
  draft: ['issued', 'cancelled'],
  issued: ['partially-dispensed', 'dispensed', 'cancelled'],
  'partially-dispensed': ['dispensed', 'cancelled'],
  dispensed: [],
  cancelled: [],
};

function assertStatus(status) {
  if (!PRESCRIPTION_STATUSES.includes(status)) throw new ApiError(400, 'Invalid prescription status.');
  return status;
}
function assertFrequency(f) {
  if (!PRESCRIPTION_FREQUENCIES.includes(f)) throw new ApiError(400, 'Invalid frequency.');
  return f;
}
function assertDurationUnit(u) {
  if (!DURATION_UNITS.includes(u)) throw new ApiError(400, 'Invalid duration unit.');
  return u;
}
function assertRoute(r) {
  if (!ROUTES.includes(r)) throw new ApiError(400, 'Invalid route.');
  return r;
}
function assertFood(f) {
  if (!FOOD_INSTRUCTIONS.includes(f)) throw new ApiError(400, 'Invalid food instruction.');
  return f;
}

function assertTransition(from, to) {
  if (from === to) return;
  if (!(TRANSITIONS[from] || []).includes(to)) {
    throw new ApiError(400, `Invalid prescription status transition: ${from} → ${to}.`);
  }
}

async function assertPatient(patientId) {
  if (!patientId) throw new ApiError(400, 'Patient is required.');
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
  let diagnosis = null;
  if (payload.diagnosisId) {
    diagnosis = await Diagnosis.findById(payload.diagnosisId);
    if (!diagnosis || String(diagnosis.patient) !== String(payload.patientId)) {
      throw new ApiError(400, 'Diagnosis reference must belong to the prescription patient.');
    }
  }
  return { visit, consultation, diagnosis };
}

function buildItem(item) {
  if (!item || !String(item.medicine || '').trim()) {
    throw new ApiError(400, 'Each medicine requires a name.');
  }
  const normalized = {
    medicineId: item.medicineId || null,
    medicine: String(item.medicine).trim(),
    genericName: item.genericName ? String(item.genericName).trim() : '',
    dosage: item.dosage !== undefined && item.dosage !== null ? String(item.dosage).trim() : '',
    unit: item.unit ? String(item.unit).trim() : 'mg',
    frequency: item.frequency ? assertFrequency(item.frequency) : 'twice-daily',
    customFrequency: item.customFrequency ? String(item.customFrequency).trim() : '',
    duration: item.duration !== undefined && item.duration !== null && item.duration !== '' ? Number(item.duration) : null,
    durationUnit: item.durationUnit ? assertDurationUnit(item.durationUnit) : 'day',
    route: item.route ? assertRoute(item.route) : 'oral',
    quantity: item.quantity !== undefined && item.quantity !== null && item.quantity !== '' ? Number(item.quantity) : null,
    foodInstruction: item.foodInstruction ? assertFood(item.foodInstruction) : 'after-food',
    instructions: item.instructions ? String(item.instructions).trim() : '',
    notes: item.notes ? String(item.notes).trim() : '',
  };
  const dose = Number(normalized.dosage);
  if (normalized.dosage !== '' && !Number.isFinite(dose)) {
    throw new ApiError(400, `Invalid dosage for ${normalized.medicine}.`);
  }
  if (normalized.duration !== null && (!Number.isFinite(normalized.duration) || normalized.duration < 0)) {
    throw new ApiError(400, `Invalid duration for ${normalized.medicine}.`);
  }
  return normalized;
}

function sanitizeItems(items) {
  return (items || []).map((i) => {
    const d = i && i.toObject ? i.toObject() : i;
    return {
      id: d._id,
      medicineId: d.medicineId || null,
      medicine: d.medicine,
      genericName: d.genericName || '',
      dosage: d.dosage || '',
      unit: d.unit || 'mg',
      frequency: d.frequency,
      customFrequency: d.customFrequency || '',
      duration: d.duration ?? null,
      durationUnit: d.durationUnit || 'day',
      route: d.route,
      quantity: d.quantity ?? null,
      foodInstruction: d.foodInstruction || 'after-food',
      instructions: d.instructions || '',
      notes: d.notes || '',
      dispensedQuantity: d.dispensedQuantity ?? 0,
    };
  });
}

function sanitize(doc) {
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    id: d._id,
    prescriptionNumber: d.prescriptionNumber,
    patient: d.patient,
    visit: d.visit,
    consultation: d.consultation,
    doctor: d.doctor,
    diagnosis: d.diagnosis,
    rxDate: d.rxDate,
    status: d.status,
    issuedAt: d.issuedAt,
    issuedBy: d.issuedBy,
    cancelledAt: d.cancelledAt,
    cancelledBy: d.cancelledBy,
    cancelReason: d.cancelReason || '',
    notes: d.notes || '',
    items: sanitizeItems(d.items),
    medicineCount: (d.items || []).length,
    dispensedQuantity: (d.items || []).reduce((s, i) => s + (i.dispensedQuantity || 0), 0),
    dispensedAt: d.dispensedAt,
    dispensedBy: d.dispensedBy,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

const baseQuery = (id) =>
  Prescription.findOne({ _id: id, isArchived: false })
    .populate('patient', 'firstName lastName patientId gender phone dob')
    .populate('doctor', 'name')
    .populate('issuedBy', 'name')
    .populate('cancelledBy', 'name')
    .populate('visit', 'opNumber')
    .populate('consultation', 'status')
    .populate('diagnosis', 'name category toothNumber');

async function create(payload, actor) {
  const patient = await assertPatient(payload.patientId);
  const { visit, consultation, diagnosis } = await resolveRefs(payload);
  const doctor = await User.findById(actor._id);
  if (!doctor || !['doctor', 'admin'].includes(doctor.role)) throw new ApiError(400, 'A valid doctor is required');

  const items = Array.isArray(payload.items) ? payload.items.map(buildItem) : [];

  const doc = await Prescription.create({
    prescriptionNumber: await nextPrescriptionNumber(),
    patient: patient._id,
    visit: visit ? visit._id : null,
    consultation: consultation ? consultation._id : null,
    doctor: doctor._id,
    diagnosis: diagnosis ? diagnosis._id : null,
    rxDate: payload.rxDate || new Date(),
    status: 'draft',
    notes: payload.notes || '',
    items,
  });

  await recordAudit({
    user: actor,
    action: 'create',
    entity: 'prescription',
    entityId: doc._id,
    description: `Prescription ${doc.prescriptionNumber} created (${items.length} medicine${items.length === 1 ? '' : 's'})`,
    meta: { patient: patient._id, opNumber: visit ? visit.opNumber : undefined, amount: items.length },
  });

  return sanitize(await baseQuery(doc._id));
}

async function get(id, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Prescription not found');
  return sanitize(doc);
}

async function getPrintView(id, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Prescription not found');
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    id: doc._id,
    prescriptionNumber: d.prescriptionNumber,
    patient: d.patient,
    doctor: d.doctor,
    rxDate: d.rxDate,
    issuedAt: d.issuedAt,
    status: d.status,
    notes: d.notes || '',
    items: sanitizeItems(d.items),
  };
}

async function update(id, payload, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Prescription not found');

  // Once issued, only the status may change (via issue/dispense/cancel paths); content is locked.
  if (['issued', 'partially-dispensed', 'dispensed'].includes(doc.status) && payload.items) {
    throw new ApiError(409, 'Medicine lines cannot be changed on an issued prescription. Create a new revision if needed.');
  }

  if (payload.notes !== undefined) doc.notes = payload.notes;
  if (payload.rxDate !== undefined) doc.rxDate = payload.rxDate;
  if (payload.diagnosisId !== undefined) {
    const diagnosis = payload.diagnosisId
      ? await Diagnosis.findById(payload.diagnosisId)
      : null;
    if (payload.diagnosisId && (!diagnosis || String(diagnosis.patient) !== String(doc.patient))) {
      throw new ApiError(400, 'Diagnosis reference must belong to the prescription patient.');
    }
    doc.diagnosis = diagnosis ? diagnosis._id : null;
  }
  if (payload.items !== undefined) {
    if (['issued', 'partially-dispensed', 'dispensed'].includes(doc.status)) {
      throw new ApiError(409, 'Medicine lines cannot be changed on an issued prescription.');
    }
    doc.items = payload.items.map(buildItem);
  }

  if (payload.status !== undefined) {
    const next = assertStatus(payload.status);
    assertTransition(doc.status, next);
    if (next === 'cancelled') {
      doc.cancelledAt = new Date();
      doc.cancelledBy = actor._id;
      doc.cancelReason = payload.cancelReason ? String(payload.cancelReason).trim() : '';
    }
    doc.status = next;
  }

  await doc.save();
  await recordAudit({
    user: actor,
    action: 'update',
    entity: 'prescription',
    entityId: doc._id,
    description: `Prescription ${doc.prescriptionNumber} updated → ${doc.status}`,
    meta: { patient: doc.patient, opNumber: doc.visit?.opNumber },
  });

  return sanitize(await baseQuery(id));
}

async function issue(id, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Prescription not found');
  if (['dispensed', 'cancelled'].includes(doc.status)) {
    throw new ApiError(409, 'Cannot issue a dispensed or cancelled prescription.');
  }
  if ((doc.items || []).length === 0) {
    throw new ApiError(400, 'A prescription must contain at least one medicine before issuing.');
  }
  assertTransition(doc.status, 'issued');
  doc.status = 'issued';
  doc.issuedAt = new Date();
  doc.issuedBy = actor._id;
  await doc.save();

  await recordAudit({
    user: actor,
    action: 'issue',
    entity: 'prescription',
    entityId: doc._id,
    description: `Prescription ${doc.prescriptionNumber} issued`,
    meta: { patient: doc.patient, opNumber: doc.visit?.opNumber },
  });

  return sanitize(await baseQuery(id));
}

async function listByPatient(patientId, actor) {
  await assertPatient(patientId);
  const docs = await Prescription.find({ patient: patientId, isArchived: false })
    .sort({ createdAt: -1 })
    .populate('patient', 'name patientId')
    .populate('doctor', 'name')
    .populate('issuedBy', 'name')
    .populate('visit', 'opNumber')
    .populate('consultation', 'status')
    .populate('diagnosis', 'name category toothNumber');
  return docs.map(sanitize);
}

async function listByConsultation(consultationId, actor) {
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) throw new ApiError(404, 'Consultation not found');
  const docs = await Prescription.find({ consultation: consultationId, isArchived: false })
    .sort({ createdAt: -1 })
    .populate('patient', 'name')
    .populate('doctor', 'name')
    .populate('issuedBy', 'name')
    .populate('visit', 'opNumber')
    .populate('consultation', 'status')
    .populate('diagnosis', 'name category toothNumber');
  return docs.map(sanitize);
}

module.exports = {
  create,
  get,
  update,
  issue,
  listByPatient,
  listByConsultation,
  getPrintView,
};