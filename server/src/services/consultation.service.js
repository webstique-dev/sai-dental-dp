const { Consultation, CONSULTATION_STATUSES } = require('../models/Consultation');
const { Visit } = require('../models/Visit');
const Patient = require('../models/Patient');
const { Appointment } = require('../models/Appointment');
const { User } = require('../models/User');
const { nextOpNumber } = require('../models/Counter');
const { recordAudit } = require('../utils/audit');
const ApiError = require('../utils/ApiError');

const editableKeys = [
  'visitDate',
  'medicalHistory',
  'vitals',
  'habits',
  'dentalHistory',
  'extraoralExamination',
  'intraoralExamination',
  'gingivalFindings',
  'hardTissueExamination',
  'clinicalFindings',
];

function pickEditable(body) {
  const out = {};
  for (const key of editableKeys) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  if (body.status && CONSULTATION_STATUSES.includes(body.status)) {
    if (body.status !== 'completed' && body.status !== 'cancelled') {
      out.status = body.status;
    }
  }
  return out;
}

async function baseQuery(id) {
  return Consultation.findById(id)
    .populate('patient', 'firstName lastName patientId gender dob phone city bloodGroup permanentAlerts isArchived')
    .populate('doctor', 'name role')
    .populate('visit', 'opNumber opDate lastAnnualRev status')
    .populate('appointment', 'appointmentNumber date time reason notes type source token');
}

function sanitize(consultation) {
  const c = consultation.toObject ? consultation.toObject() : consultation;
  c.id = c._id;
  delete c._id;
  if (c.patient && c.patient._id) {
    c.patient.id = c.patient._id;
    delete c.patient._id;
  }
  if (c.doctor && c.doctor._id) {
    c.doctor.id = c.doctor._id;
    delete c.doctor._id;
  }
  c.opNumber = c.visit ? c.visit.opNumber : undefined;
  return c;
}

function summaryView(consultation) {
  const c = consultation.toObject();
  return {
    id: c._id,
    status: c.status,
    patient: c.patient,
    doctor: c.doctor,
    opNumber: c.visit ? c.visit.opNumber : undefined,
    visit: c.visit ? c.visit._id : undefined,
    appointment: c.appointment || null,
    visitDate: c.visitDate,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    completedAt: c.completedAt,
  };
}

async function assertEditAccess(consultation, actor) {
  if (actor.role === 'admin') return;
  if (actor.role === 'doctor') {
    const docId = consultation.doctor?._id ? String(consultation.doctor._id) : (consultation.doctor ? String(consultation.doctor) : null);
    const actorId = actor._id ? String(actor._id) : (actor.id ? String(actor.id) : null);
    if (docId && docId === actorId) return;

    const patId = consultation.patient?._id || consultation.patient?.id || consultation.patient;
    if (patId && actorId) {
      const { Appointment } = require('../models/Appointment');
      const { Visit } = require('../models/Visit');
      const [assignedAppt, assignedVisit] = await Promise.all([
        Appointment.findOne({ patient: patId, doctor: actorId, isDeleted: { $ne: true } }),
        Visit.findOne({ patient: patId, doctor: actorId, isDeleted: { $ne: true } }),
      ]);
      if (assignedAppt || assignedVisit) {
        consultation.doctor = actor._id || actor.id;
        await consultation.save();
        return;
      }
    }
  }
  throw new ApiError(403, 'You do not have permission to edit this consultation');
}

async function createConsultation(payload, actor) {
  if (!payload.patientId) {
    throw new ApiError(400, 'Patient is required');
  }
  const patient = await Patient.findById(payload.patientId);
  if (!patient) throw new ApiError(404, 'Patient not found');

  let doctor = null;
  if (actor.role === 'doctor') {
    doctor = actor;
  } else if (payload.doctorId) {
    doctor = await User.findById(payload.doctorId);
  } else if (payload.appointmentId) {
    const appt = await Appointment.findById(payload.appointmentId);
    if (appt?.doctor) doctor = await User.findById(appt.doctor);
  }
  if (!doctor || doctor.role !== 'doctor') {
    throw new ApiError(400, 'A valid doctor is required');
  }

  let appointment = null;
  if (payload.appointmentId) {
    appointment = await Appointment.findById(payload.appointmentId);
  }

  // Check if a consultation record already exists for this patient
  let existingCons = await Consultation.findOne({ patient: patient._id, isArchived: false });

  if (existingCons) {
    existingCons.doctor = doctor._id;
    if (appointment) existingCons.appointment = appointment._id;
    existingCons.status = 'in-progress';
    Object.assign(existingCons, pickEditable(payload));

    if (payload.clinicalExamination) {
      existingCons.clinicalExamination = {
        ...existingCons.clinicalExamination,
        ...payload.clinicalExamination,
      };
    }

    await existingCons.save();

    // Ensure Visit record exists/updated
    let visit = existingCons.visit ? await Visit.findById(existingCons.visit) : null;
    if (!visit) {
      const opNumber = await nextOpNumber();
      visit = await Visit.create({
        opNumber,
        opDate: new Date(),
        patient: patient._id,
        doctor: doctor._id,
        appointment: appointment ? appointment._id : null,
        consultation: existingCons._id,
        status: 'in-progress',
      });
      existingCons.visit = visit._id;
      await existingCons.save();
    } else {
      visit.doctor = doctor._id;
      visit.status = 'in-progress';
      if (appointment) visit.appointment = appointment._id;
      await visit.save();
    }

    await recordAudit({
      user: actor,
      action: 'update',
      entity: 'consultation',
      entityId: existingCons._id,
      description: `Single consultation updated for patient ${patient.fullName || patient.patientId}`,
    });

    const fresh = await baseQuery(existingCons._id);
    return sanitize(fresh);
  }

  // If no consultation record exists, initialize the single consultation record
  const opNumber = await nextOpNumber();
  const visit = await Visit.create({
    opNumber,
    opDate: payload.visitDate || new Date(),
    patient: patient._id,
    doctor: doctor._id,
    appointment: appointment ? appointment._id : null,
    status: 'in-progress',
  });

  const consultation = await Consultation.create({
    status: 'in-progress',
    patient: patient._id,
    visit: visit._id,
    appointment: appointment ? appointment._id : null,
    doctor: doctor._id,
    visitDate: visit.opDate,
    medicalHistory: {
      conditions: payload.medicalHistory?.conditions || undefined,
    },
    ...pickEditable(payload),
  });

  visit.consultation = consultation._id;
  await visit.save();

  await recordAudit({
    user: actor,
    action: 'create',
    entity: 'consultation',
    entityId: consultation._id,
    description: `Single consultation record initialized for ${patient.fullName || patient.patientId}`,
  });

  const fresh = await baseQuery(consultation._id);
  return sanitize(fresh);
}

async function getConsultation(id, actor) {
  const consultation = await baseQuery(id);
  if (!consultation) throw new ApiError(404, 'Consultation not found');

  if (actor.role === 'receptionist') {
    return summaryView(consultation);
  }
  return sanitize(consultation);
}

async function reviseConsultation(id, payload, actor) {
  const consultation = await Consultation.findById(id);
  if (!consultation) throw new ApiError(404, 'Consultation not found');
  await assertEditAccess(consultation, actor);

  if (consultation.status === 'completed' || consultation.status === 'cancelled') {
    throw new ApiError(400, 'Completed or cancelled consultations cannot be edited');
  }

  Object.assign(consultation, pickEditable(payload));

  // Persist the medical history condition list, keeping defaults in sync.
  if (payload.medicalHistory?.conditions) {
    consultation.medicalHistory.conditions = payload.medicalHistory.conditions;
  }

  await consultation.save();

  await recordAudit({
    user: actor,
    action: 'update',
    entity: 'consultation',
    entityId: consultation._id,
    description: 'Consultation updated',
  });

  const refreshed = await baseQuery(id);
  return sanitize(refreshed);
}

async function completeConsultation(id, actor) {
  const consultation = await Consultation.findById(id);
  if (!consultation) throw new ApiError(404, 'Consultation not found');
  assertEditAccess(consultation, actor);

  if (consultation.status === 'completed') {
    throw new ApiError(400, 'Consultation is already completed');
  }
  if (consultation.status === 'cancelled') {
    throw new ApiError(400, 'Consultation has been cancelled');
  }

  consultation.status = 'completed';
  consultation.completedBy = actor._id;
  consultation.completedAt = new Date();

  await consultation.save();
  if (consultation.visit) {
    await Visit.findByIdAndUpdate(consultation.visit, { status: 'completed' });
  }
  if (consultation.appointment) {
    await Appointment.findByIdAndUpdate(consultation.appointment, { status: 'completed' });
  }

  await recordAudit({
    user: actor,
    action: 'complete',
    entity: 'consultation',
    entityId: consultation._id,
    description: 'Consultation completed',
  });

  const refreshed = await baseQuery(id);
  return sanitize(refreshed);
}

async function patientConsultations(patientId, actor) {
  const patient = await Patient.findById(patientId);
  if (!patient) throw new ApiError(404, 'Patient not found');

  const items = await Consultation.find({ patient: patientId, isArchived: false })
    .populate('patient', 'firstName lastName patientId gender dob phone city bloodGroup permanentAlerts isArchived')
    .populate('doctor', 'name role')
    .populate('visit', 'opNumber opDate status')
    .populate('appointment', 'appointmentNumber date time')
    .sort({ visitDate: -1 })
    .limit(50);

  if (actor.role === 'receptionist') {
    return {
      items: items.map((c) => summaryView(c)),
      total: items.length,
    };
  }

  return {
    items: items.map((c) => sanitize(c)),
    total: items.length,
  };
}

module.exports = {
  createConsultation,
  getConsultation,
  reviseConsultation,
  completeConsultation,
  patientConsultations,
};
