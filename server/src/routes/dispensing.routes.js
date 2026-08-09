const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const dispensingController = require('../controllers/dispensing.controllers');

// Dispensing record management.
const mainRouter = express.Router({ mergeParams: true });
mainRouter.post('/dispensing', protect, authorize('admin', 'pharmacy'), dispensingController.create);
mainRouter.get('/dispensing/:id', protect, authorize('admin', 'pharmacy', 'doctor', 'receptionist'), dispensingController.get);
mainRouter.post('/dispensing/:id/complete', protect, authorize('admin', 'pharmacy'), dispensingController.complete);
mainRouter.post('/dispensing/:id/cancel', protect, authorize('admin', 'pharmacy'), dispensingController.cancel);

// GET /api/prescriptions/:prescriptionId/dispensing
const prescriptionRouter = express.Router({ mergeParams: true });
prescriptionRouter.get('/', protect, authorize('admin', 'pharmacy', 'doctor', 'receptionist'), dispensingController.listByPrescription);

// GET /api/patients/:patientId/dispensing
const patientRouter = express.Router({ mergeParams: true });
patientRouter.get('/', protect, authorize('admin', 'pharmacy', 'doctor', 'receptionist'), dispensingController.listByPatient);

module.exports = { mainRouter, prescriptionRouter, patientRouter };