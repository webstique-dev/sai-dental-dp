const express = require('express');
const healthRoutes = require('./health.routes');
const publicRoutes = require('./public.routes');
const authRoutes = require('./auth.routes');
const patientRoutes = require('./patient.routes');
const appointmentRoutes = require('./appointment.routes');
const consultationRoutes = require('./consultation.routes');
const toothChartRoutes = require('./toothChart.routes');
const diagnosisRoutes = require('./diagnosis.routes');
const treatmentPlanRoutes = require('./treatmentPlan.routes');
const prescriptionRoutes = require('./prescription.routes');
const investigationRoutes = require('./investigation.routes');
const treatmentRecordRoutes = require('./treatmentRecord.routes');
const followUpRoutes = require('./followUp.routes');
const serviceRoutes = require('./service.routes');
const invoiceRoutes = require('./invoice.routes');
const medicineRoutes = require('./medicine.routes');
const pharmacyRoutes = require('./pharmacy.routes');
const batchRoutes = require('./batch.routes');
const inventoryRoutes = require('./inventory.routes');
const dispensingRoutes = require('./dispensing.routes');
const consultationController = require('../controllers/consultation.controllers');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/public', publicRoutes);
router.use('/auth', authRoutes);
router.use('/patients', patientRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/consultations', consultationRoutes);

// Patient-scoped tooth chart: /api/patients/:patientId/tooth-chart
router.use('/patients/:patientId/tooth-chart', toothChartRoutes);

// Diagnosis module
router.use('/', diagnosisRoutes.createRouter);
router.use('/consultations/:consultationId/diagnoses', diagnosisRoutes.consultationRouter);
router.use('/patients/:patientId/diagnoses', diagnosisRoutes.patientRouter);

// Treatment plan module
router.use('/', treatmentPlanRoutes.mainRouter);
router.use('/patients/:patientId/treatment-plans', treatmentPlanRoutes.patientRouter);

// Prescription module
router.use('/', prescriptionRoutes.mainRouter);
router.use('/consultations/:consultationId/prescriptions', prescriptionRoutes.consultationRouter);
router.use('/patients/:patientId/prescriptions', prescriptionRoutes.patientRouter);

// Investigation module
router.use('/', investigationRoutes.mainRouter);
router.use('/consultations/:consultationId/investigations', investigationRoutes.consultationRouter);
router.use('/patients/:patientId/investigations', investigationRoutes.patientRouter);

// Treatment record module
router.use('/', treatmentRecordRoutes.mainRouter);
router.use('/patients/:patientId/treatment-records', treatmentRecordRoutes.patientRouter);
router.use('/consultations/:consultationId/treatment-records', treatmentRecordRoutes.consultationRouter);
router.use('/treatment-plans/:planId/treatment-records', treatmentRecordRoutes.planRouter);

// Follow-up module
router.use('/', followUpRoutes.mainRouter);
router.use('/patients/:patientId/follow-ups', followUpRoutes.patientRouter);
router.use('/consultations/:consultationId/follow-ups', followUpRoutes.consultationRouter);

// Patient-scoped clinical listing: GET /api/patients/:patientId/consultations
const patientClinicalRouter = express.Router();
patientClinicalRouter.get(
  '/:patientId/consultations',
  require('../middleware/auth').protect,
  require('../middleware/auth').authorize('admin', 'doctor', 'receptionist'),
  consultationController.patientConsultations,
);
router.use('/patients', patientClinicalRouter);

// Billing & payment module
router.use('/', serviceRoutes.mainRouter);
router.use('/', invoiceRoutes.mainRouter);
router.use('/patients/:patientId/invoices', invoiceRoutes.patientRouter);
router.use('/op-visits/:opVisitId/invoices', invoiceRoutes.visitRouter);

// Pharmacy & inventory module
router.use('/', medicineRoutes.mainRouter);
router.use('/medicines/:medicineId', medicineRoutes.medicineRouter);
router.use('/', pharmacyRoutes.mainRouter);
router.use('/medicine-batches', batchRoutes.mainRouter);
router.use('/inventory', inventoryRoutes.mainRouter);
router.use('/', dispensingRoutes.mainRouter);
router.use('/prescriptions/:prescriptionId/dispensing', dispensingRoutes.prescriptionRouter);
router.use('/patients/:patientId/dispensing', dispensingRoutes.patientRouter);

module.exports = router;