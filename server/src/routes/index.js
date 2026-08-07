const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const patientRoutes = require('./patient.routes');
const appointmentRoutes = require('./appointment.routes');
const consultationRoutes = require('./consultation.routes');
const consultationController = require('../controllers/consultation.controllers');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/patients', patientRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/consultations', consultationRoutes);

// Patient-scoped clinical listing: GET /api/patients/:patientId/consultations
const patientClinicalRouter = express.Router();
patientClinicalRouter.get(
  '/:patientId/consultations',
  require('../middleware/auth').protect,
  require('../middleware/auth').authorize('admin', 'doctor', 'receptionist'),
  consultationController.patientConsultations,
);
router.use('/patients', patientClinicalRouter);

module.exports = router;