const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const prescriptionController = require('../controllers/prescription.controllers');

// POST /api/prescriptions etc.
const mainRouter = express.Router({ mergeParams: true });
mainRouter.post('/prescriptions', protect, authorize('admin', 'doctor'), prescriptionController.create);
mainRouter.get('/prescriptions/:id', protect, authorize('admin', 'doctor', 'receptionist', 'pharmacy'), prescriptionController.get);
mainRouter.patch('/prescriptions/:id', protect, authorize('admin', 'doctor'), prescriptionController.update);
mainRouter.post('/prescriptions/:id/issue', protect, authorize('admin', 'doctor'), prescriptionController.issue);
mainRouter.get('/prescriptions/:id/print', protect, authorize('admin', 'doctor', 'receptionist', 'pharmacy'), prescriptionController.print);

// GET /api/consultations/:consultationId/prescriptions
const consultationRouter = express.Router({ mergeParams: true });
consultationRouter.get('/', protect, authorize('admin', 'doctor', 'receptionist', 'pharmacy'), prescriptionController.listByConsultation);

// GET /api/patients/:patientId/prescriptions
const patientRouter = express.Router({ mergeParams: true });
patientRouter.get('/', protect, authorize('admin', 'doctor', 'receptionist', 'pharmacy'), prescriptionController.listByPatient);

module.exports = { mainRouter, consultationRouter, patientRouter };