const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const diagnosisController = require('../controllers/diagnosis.controllers');

// POST /api/diagnoses
const createRouter = express.Router({ mergeParams: true });
createRouter.post('/diagnoses', protect, authorize('admin', 'doctor'), diagnosisController.create);
createRouter.get('/diagnoses/:id', protect, authorize('admin', 'doctor', 'receptionist'), diagnosisController.get);
createRouter.patch('/diagnoses/:id', protect, authorize('admin', 'doctor'), diagnosisController.update);
createRouter.delete('/diagnoses/:id', protect, authorize('admin', 'doctor'), diagnosisController.remove);
createRouter.post('/diagnoses/:id/restore', protect, authorize('admin'), diagnosisController.restore);

// GET /api/consultations/:consultationId/diagnoses
const consultationRouter = express.Router({ mergeParams: true });
consultationRouter.get('/', protect, authorize('admin', 'doctor', 'receptionist'), diagnosisController.listByConsultation);

// GET /api/patients/:patientId/diagnoses
const patientRouter = express.Router({ mergeParams: true });
patientRouter.get('/', protect, authorize('admin', 'doctor', 'receptionist'), diagnosisController.listByPatient);

module.exports = { createRouter, consultationRouter, patientRouter };