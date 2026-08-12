const FollowUp = require('../models/FollowUp');
const { FOLLOW_UP_TYPES, FOLLOW_UP_STATUSES } = FollowUp;
const TreatmentRecord = require('../models/TreatmentRecord');
const TreatmentPlan = require('../models/TreatmentPlan');
const Patient = require('../models/Patient');
const { Visit } = require('../models/Visit');
const { Consultation } = require('../models/Consultation');
const { User } = require('../models/User');
const { Appointment } = require('../models/Appointment');
const { nextFollowUpNumber } = require('../models/Counter');
const { recordAudit } = require('../utils/audit');
const ApiError = require('../utils/ApiError');
const appointmentService = require('./appointment.service');

const FOLLOW_UP_TRANSITIONS = {
  planned: ['scheduled', 'completed', 'missed', 'cancelled', 'rescheduled'],
  scheduled: ['completed', 'missed', 'cancelled', 'rescheduled'],
  rescheduled: ['scheduled', 'completed', 'missed', 'cancelled'],
  completed: [],
  missed: ['rescheduled', 'cancelled'],
  cancelled: [],
};

function assertStatus(s) {
  if (!FOLLOW_UP_STATUSES.includes(s)) throw new ApiError(400, 'Invalid follow-up status.');
  return s;
}
function assertType(t) {
  if (!FOLLOW_UP_TYPES.includes(t)) throw new ApiError(400, 'Invalid follow-up type.');
  return t;
}
function assertTransition(from, to) {
  if (from === to) return;
  if (!(FOLLOW_UP_TRANSITIONS[from] || []).includes(to)) {
    throw new ApiError(400, `Invalid follow-up status transition: ${from} → ${to}.`);
  }
}

async function assertPatient(patientId) {
  if (!patientId) throw new ApiError(400, 'Patient is required.');
  const patient = await Patient.findById(patientId);
  if (!patient) throw new ApiError(404, 'Patient not found');
  return patient;
}

function sanitize(doc) {
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    id: d._id,
    followUpNumber: d.followUpNumber,
    patient: d.patient,
    visit: d.visit,
    consultation: d.consultation,
    doctor: d.doctor,
    treatmentRecord: d.treatmentRecord,
    treatmentPlan: d.treatmentPlan,
    appointment: d.appointment,
    toothNumber: d.toothNumber,
    hasTooth: !!d.hasTooth,
    type: d.type,
    followUpDate: d.followUpDate,
    followUpTime: d.followUpTime || '',
    reason: d.reason || '',
    instructions: d.instructions || '',
    notes: d.notes || '',
    status: d.status,
    reminder: d.reminder || { status: 'pending', reminderDate: null },
    completedAt: d.completedAt,
    completedBy: d.completedBy,
    completedNotes: d.completedNotes || '',
    cancelledAt: d.cancelledAt,
    cancelReason: d.cancelReason || '',
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

const baseQuery = (id) =>
  FollowUp.findOne({ _id: id, isArchived: false, isDeleted: { $ne: true } })
    .populate('patient', 'firstName lastName patientId gender phone dob')
    .populate('doctor', 'name')
    .populate('completedBy', 'name')
    .populate('cancelledBy', 'name')
    .populate('visit', 'opNumber')
    .populate('consultation', 'status')
    .populate('treatmentRecord', 'recordNumber procedure toothNumber status')
    .populate('treatmentPlan', 'planNumber name status')
    .populate('appointment', 'appointmentNumber date time status');

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
  let treatmentRecord = null;
  if (payload.treatmentRecordId) {
    treatmentRecord = await TreatmentRecord.findById(payload.treatmentRecordId);
    if (!treatmentRecord || String(treatmentRecord.patient) !== String(patientId)) {
      throw new ApiError(400, 'Treatment record must belong to the follow-up patient.');
    }
  }
  let treatmentPlan = null;
  if (payload.treatmentPlanId) {
    treatmentPlan = await TreatmentPlan.findById(payload.treatmentPlanId);
    if (!treatmentPlan || String(treatmentPlan.patient) !== String(patientId)) {
      throw new ApiError(400, 'Treatment plan must belong to the follow-up patient.');
    }
  }
  let appointment = null;
  if (payload.appointmentId) {
    appointment = await Appointment.findById(payload.appointmentId);
    if (!appointment || String(appointment.patient) !== String(patientId)) {
      throw new ApiError(400, 'Appointment must belong to the follow-up patient.');
    }
  }
  return { visit, consultation, treatmentRecord, treatmentPlan, appointment };
}

async function create(payload, actor) {
  const patient = await assertPatient(payload.patientId);
  const doctor = await User.findById(actor._id);
  if (!doctor || !['doctor', 'admin'].includes(doctor.role)) throw new ApiError(400, 'A valid doctor is required');
  if (!payload.followUpDate || !Number.isFinite(new Date(payload.followUpDate).getTime())) {
    throw new ApiError(400, 'A valid follow-up date is required');
  }

  const { visit, consultation, treatmentRecord, treatmentPlan, appointment } = await resolveRefs(payload, patient._id);
  const status = assertStatus(payload.status || 'planned');
  const tooth = Number(payload.toothNumber) || (treatmentRecord && treatmentRecord.toothNumber) || 0;

  const doc = await FollowUp.create({
    followUpNumber: await nextFollowUpNumber(),
    patient: patient._id,
    visit: visit ? visit._id : null,
    consultation: consultation ? consultation._id : null,
    doctor: doctor._id,
    treatmentRecord: treatmentRecord ? treatmentRecord._id : null,
    treatmentPlan: treatmentPlan ? treatmentPlan._id : null,
    appointment: appointment ? appointment._id : null,
    toothNumber: tooth,
    hasTooth: tooth > 0,
    type: assertType(payload.type || 'review'),
    followUpDate: payload.followUpDate,
    followUpTime: payload.followUpTime || '',
    reason: payload.reason || '',
    instructions: payload.instructions || '',
    notes: payload.notes || '',
    status,
    reminder: { status: 'pending', reminderDate: payload.followUpDate || null },
  });

  await recordAudit({
    user: actor,
    action: 'create',
    entity: 'follow-up',
    entityId: doc._id,
    description: `Follow-up ${doc.followUpNumber} created`,
    meta: { patient: patient._id, type: doc.type, followUpDate: doc.followUpDate, treatmentRecord: doc.treatmentRecord || undefined, opNumber: visit ? visit.opNumber : undefined },
  });

  return sanitize(await baseQuery(doc._id));
}

async function get(id, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Follow-up not found');
  return sanitize(doc);
}

async function update(id, payload, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Follow-up not found');
  if (doc.status === 'completed' || doc.status === 'cancelled') {
    throw new ApiError(409, 'A completed or cancelled follow-up cannot be edited.');
  }

  if (payload.type !== undefined) doc.type = assertType(payload.type);
  if (payload.followUpDate !== undefined) {
    if (!Number.isFinite(new Date(payload.followUpDate).getTime())) throw new ApiError(400, 'A valid follow-up date is required');
    doc.followUpDate = payload.followUpDate;
    if (doc.reminder) doc.reminder.reminderDate = doc.reminder.reminderDate || payload.followUpDate;
  }
  if (payload.followUpTime !== undefined) doc.followUpTime = payload.followUpTime;
  if (payload.reason !== undefined) doc.reason = payload.reason;
  if (payload.instructions !== undefined) doc.instructions = payload.instructions;
  if (payload.notes !== undefined) doc.notes = payload.notes;
  if (payload.appointmentId !== undefined) {
    const appointment = payload.appointmentId
      ? await Appointment.findById(payload.appointmentId)
      : null;
    if (payload.appointmentId && (!appointment || String(appointment.patient) !== String(doc.patient))) {
      throw new ApiError(400, 'Appointment must belong to the follow-up patient.');
    }
    doc.appointment = appointment ? appointment._id : null;
  }

  if (payload.status !== undefined) {
    const next = assertStatus(payload.status);
    assertTransition(doc.status, next);
    if (next === 'completed') {
      doc.completedAt = new Date();
      doc.completedBy = actor._id;
      doc.completedNotes = payload.completedNotes ? String(payload.completedNotes).trim() : doc.completedNotes;
    }
    if (next === 'cancelled') {
      doc.cancelledAt = new Date();
      doc.cancelledBy = actor._id;
      doc.cancelReason = payload.cancelReason ? String(payload.cancelReason).trim() : '';
    }
    doc.status = next;
  }

  await doc.save();

  let action = 'update';
  if (payload.status === 'scheduled') action = 'schedule';
  if (payload.status === 'rescheduled') action = 'reschedule';
  if (payload.status === 'missed') action = 'missed';
  if (payload.status === 'completed') action = 'complete';
  if (payload.status === 'cancelled') action = 'cancel';

  await recordAudit({
    user: actor,
    action,
    entity: 'follow-up',
    entityId: doc._id,
    description: `Follow-up ${doc.followUpNumber} → ${doc.status}`,
    meta: { patient: doc.patient, type: doc.type, followUpDate: doc.followUpDate, toothNumber: doc.toothNumber },
  });

  return sanitize(await baseQuery(id));
}

async function complete(id, payload, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Follow-up not found');
  if (doc.status === 'completed') throw new ApiError(400, 'Follow-up is already completed.');
  assertTransition(doc.status, 'completed');
  doc.status = 'completed';
  doc.completedAt = new Date();
  doc.completedBy = actor._id;
  doc.completedNotes = payload && payload.notes ? String(payload.notes).trim() : doc.completedNotes;
  await doc.save();

  await recordAudit({
    user: actor,
    action: 'complete',
    entity: 'follow-up',
    entityId: doc._id,
    description: `Follow-up ${doc.followUpNumber} completed`,
    meta: { patient: doc.patient, type: doc.type, followUpDate: doc.followUpDate },
  });

  return sanitize(await baseQuery(id));
}

async function cancel(id, payload, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Follow-up not found');
  if (['completed', 'cancelled'].includes(doc.status)) throw new ApiError(400, 'Follow-up is already closed.');
  assertTransition(doc.status, 'cancelled');
  doc.status = 'cancelled';
  doc.cancelledAt = new Date();
  doc.cancelledBy = actor._id;
  doc.cancelReason = payload && payload.reason ? String(payload.reason).trim() : '';
  await doc.save();

  await recordAudit({
    user: actor,
    action: 'cancel',
    entity: 'follow-up',
    entityId: doc._id,
    description: `Follow-up ${doc.followUpNumber} cancelled`,
    meta: { patient: doc.patient, type: doc.type, followUpDate: doc.followUpDate },
  });

  return sanitize(await baseQuery(id));
}

// Schedule = set status + create/link an appointment via the existing appointment module.
async function schedule(id, payload, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Follow-up not found');
  if (['completed', 'cancelled'].includes(doc.status)) throw new ApiError(409, 'Follow-up is already closed.');

  let appointmentId = doc.appointment ? String(doc.appointment._id) : null;
  if (payload && payload.appointmentId) {
    const appointment = await Appointment.findById(payload.appointmentId);
    if (!appointment || String(appointment.patient) !== String(doc.patient)) {
      throw new ApiError(400, 'Appointment must belong to the follow-up patient.');
    }
    appointmentId = payload.appointmentId;
  } else if (!appointmentId) {
    const appointment = await appointmentService.createAppointment({
      patient: doc.patient._id || doc.patient,
      doctor: doc.doctor._id || doc.doctor,
      date: payload && payload.appointmentDate ? payload.appointmentDate : doc.followUpDate,
      time: payload && payload.appointmentTime ? payload.appointmentTime : doc.followUpTime,
      type: 'Follow-up',
      reason: doc.reason || (doc.treatmentRecord ? doc.treatmentRecord.procedure : 'Follow-up'),
      notes: doc.notes || '',
      source: 'existing',
      status: 'scheduled',
    });
    appointmentId = appointment._id;
    await recordAudit({
      user: actor,
      action: 'create',
      entity: 'appointment',
      entityId: appointment._id,
      description: `Follow-up appointment ${appointment.appointmentNumber} created`,
      meta: { patient: appointment.patient, followUp: doc._id, reason: appointment.reason },
    });
  }

  doc.appointment = appointmentId;
  doc.status = 'scheduled';
  doc.reminder = doc.reminder || { status: 'pending' };
  doc.reminder.status = 'pending';
  doc.reminder.reminderDate = doc.reminder.reminderDate || doc.followUpDate;
  await doc.save();

  await recordAudit({
    user: actor,
    action: 'schedule',
    entity: 'follow-up',
    entityId: doc._id,
    description: `Follow-up ${doc.followUpNumber} scheduled`,
    meta: { patient: doc.patient, followUpDate: doc.followUpDate, appointment: appointmentId },
  });

  return sanitize(await baseQuery(id));
}

async function removeFollowUp(id, actor) {
  const doc = await FollowUp.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new ApiError(404, 'Follow-up not found');

  doc.isDeleted = true;
  doc.deletedAt = new Date();
  if (actor && actor._id) doc.deletedBy = actor._id;
  await doc.save();

  await recordAudit({
    user: actor,
    action: 'delete',
    entity: 'follow-up',
    entityId: doc._id,
    description: `Follow-up ${doc.followUpNumber} soft deleted`,
  });

  return { success: true, message: 'Record deleted successfully.' };
}

async function restoreFollowUp(id, actor) {
  const doc = await FollowUp.findById(id);
  if (!doc) throw new ApiError(404, 'Follow-up not found');

  doc.isDeleted = false;
  doc.deletedAt = null;
  doc.deletedBy = null;
  await doc.save();

  return sanitize(await baseQuery(id));
}

async function listByPatient(patientId, actor) {
  await assertPatient(patientId);
  const docs = await FollowUp.find({ patient: patientId, isArchived: false, isDeleted: { $ne: true } })
    .sort({ followUpDate: -1 })
    .populate('doctor', 'name')
    .populate('completedBy', 'name')
    .populate('visit', 'opNumber')
    .populate('consultation', 'status')
    .populate('treatmentRecord', 'procedure toothNumber status')
    .populate('treatmentPlan', 'planNumber name status')
    .populate('appointment', 'appointmentNumber date time status');
  return docs.map(sanitize);
}

async function listByConsultation(consultationId, actor) {
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) throw new ApiError(404, 'Consultation not found');
  const docs = await FollowUp.find({ consultation: consultationId, isArchived: false, isDeleted: { $ne: true } })
    .sort({ followUpDate: -1 })
    .populate('doctor', 'name')
    .populate('visit', 'opNumber')
    .populate('treatmentRecord', 'procedure toothNumber status')
    .populate('treatmentPlan', 'planNumber name status')
    .populate('appointment', 'appointmentNumber date time status');
  return docs.map(sanitize);
}

async function listUpcoming({ doctorId, limit = 100 } = {}, actor) {
  const filter = { isArchived: false, isDeleted: { $ne: true }, status: { $in: ['planned', 'scheduled', 'rescheduled'] }, followUpDate: { $gte: new Date() } };
  if (doctorId) {
    const doctor = await User.findById(doctorId);
    if (doctor && doctor.role === 'doctor') filter.doctor = doctorId;
  }
  const docs = await FollowUp.find(filter)
    .sort({ followUpDate: 1 })
    .limit(Number(limit) || 100)
    .populate('patient', 'firstName lastName patientId gender phone')
    .populate('doctor', 'name')
    .populate('visit', 'opNumber')
    .populate('treatmentRecord', 'procedure toothNumber status')
    .populate('treatmentPlan', 'planNumber name status')
    .populate('appointment', 'appointmentNumber date time status');
  return docs.map(sanitize);
}

module.exports = {
  create,
  get,
  update,
  complete,
  cancel,
  schedule,
  removeFollowUp,
  restoreFollowUp,
  listByPatient,
  listByConsultation,
  listUpcoming,
};