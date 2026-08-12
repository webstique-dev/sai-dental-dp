const asyncHandler = require('../utils/asyncHandler');
const consultationService = require('../services/consultation.service');
const ApiError = require('../utils/ApiError');

const create = asyncHandler(async (req, res) => {
  const consultation = await consultationService.createConsultation(req.body, req.user);
  res.status(201).json({
    success: true,
    message: 'Consultation created',
    consultation,
  });
});

const getById = asyncHandler(async (req, res) => {
  const consultation = await consultationService.getConsultation(req.params.id, req.user);
  if (req.user?.role === 'doctor') {
    const docId = consultation.doctor?._id?.toString() || consultation.doctor?.id?.toString() || consultation.doctor?.toString();
    const userId = req.user._id?.toString() || req.user.id?.toString();

    let allowed = docId && docId === userId;
    if (!allowed && consultation.patient) {
      const patId = consultation.patient._id || consultation.patient.id || consultation.patient;
      const { Appointment } = require('../models/Appointment');
      const { Visit } = require('../models/Visit');
      const [assignedAppt, assignedVisit] = await Promise.all([
        Appointment.findOne({ patient: patId, doctor: userId, isDeleted: { $ne: true } }),
        Visit.findOne({ patient: patId, doctor: userId, isDeleted: { $ne: true } }),
      ]);
      if (assignedAppt || assignedVisit) {
        allowed = true;
      }
    }

    if (!allowed) {
      throw new ApiError(403, 'Access denied. You can only view your own assigned patient consultations.');
    }
  }
  res.status(200).json({ success: true, consultation });
});

const update = asyncHandler(async (req, res) => {
  const existing = await consultationService.getConsultation(req.params.id, req.user);
  if (req.user?.role === 'doctor') {
    const docId = existing.doctor?._id?.toString() || existing.doctor?.id?.toString() || existing.doctor?.toString();
    const userId = req.user._id?.toString() || req.user.id?.toString();

    let allowed = docId && docId === userId;
    if (!allowed && existing.patient) {
      const patId = existing.patient._id || existing.patient.id || existing.patient;
      const { Appointment } = require('../models/Appointment');
      const { Visit } = require('../models/Visit');
      const [assignedAppt, assignedVisit] = await Promise.all([
        Appointment.findOne({ patient: patId, doctor: userId, isDeleted: { $ne: true } }),
        Visit.findOne({ patient: patId, doctor: userId, isDeleted: { $ne: true } }),
      ]);
      if (assignedAppt || assignedVisit) {
        allowed = true;
      }
    }

    if (!allowed) {
      throw new ApiError(403, 'Access denied. You can only edit your own assigned patient consultations.');
    }
  }
  const consultation = await consultationService.reviseConsultation(req.params.id, req.body, req.user);
  res.status(200).json({
    success: true,
    message: 'Consultation saved successfully',
    consultation,
  });
});

const complete = asyncHandler(async (req, res) => {
  const existing = await consultationService.getConsultation(req.params.id, req.user);
  if (req.user?.role === 'doctor') {
    const docId = existing.doctor?._id?.toString() || existing.doctor?.id?.toString() || existing.doctor?.toString();
    const userId = req.user._id?.toString() || req.user.id?.toString();

    let allowed = docId && docId === userId;
    if (!allowed && existing.patient) {
      const patId = existing.patient._id || existing.patient.id || existing.patient;
      const { Appointment } = require('../models/Appointment');
      const { Visit } = require('../models/Visit');
      const [assignedAppt, assignedVisit] = await Promise.all([
        Appointment.findOne({ patient: patId, doctor: userId, isDeleted: { $ne: true } }),
        Visit.findOne({ patient: patId, doctor: userId, isDeleted: { $ne: true } }),
      ]);
      if (assignedAppt || assignedVisit) {
        allowed = true;
      }
    }

    if (!allowed) {
      throw new ApiError(403, 'Access denied. You can only complete your own assigned patient consultations.');
    }
  }
  const consultation = await consultationService.completeConsultation(req.params.id, req.user);
  res.status(200).json({
    success: true,
    message: 'Consultation completed successfully',
    consultation,
  });
});

const patientConsultations = asyncHandler(async (req, res) => {
  const result = await consultationService.patientConsultations(req.params.patientId, req.user);
  res.status(200).json({ success: true, ...result });
});

module.exports = { create, getById, update, complete, patientConsultations };