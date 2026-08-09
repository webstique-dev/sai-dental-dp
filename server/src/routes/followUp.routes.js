const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const followUpController = require('../controllers/followUp.controllers');

// Main follow-up routes (admin/doctor write; receptionist read)
const mainRouter = express.Router({ mergeParams: true });
mainRouter.post('/follow-ups', protect, authorize('admin', 'doctor'), followUpController.create);
mainRouter.get('/follow-ups/upcoming', protect, authorize('admin', 'doctor', 'receptionist'), followUpController.listUpcoming);
mainRouter.get('/follow-ups/:id', protect, authorize('admin', 'doctor', 'receptionist'), followUpController.get);
mainRouter.patch('/follow-ups/:id', protect, authorize('admin', 'doctor', 'receptionist'), followUpController.update);
mainRouter.post('/follow-ups/:id/schedule', protect, authorize('admin', 'doctor', 'receptionist'), followUpController.schedule);
mainRouter.post('/follow-ups/:id/complete', protect, authorize('admin', 'doctor', 'receptionist'), followUpController.complete);
mainRouter.post('/follow-ups/:id/cancel', protect, authorize('admin', 'doctor', 'receptionist'), followUpController.cancel);

// GET /api/patients/:patientId/follow-ups
const patientRouter = express.Router({ mergeParams: true });
patientRouter.get('/', protect, authorize('admin', 'doctor', 'receptionist'), followUpController.listByPatient);

// GET /api/consultations/:consultationId/follow-ups
const consultationRouter = express.Router({ mergeParams: true });
consultationRouter.get('/', protect, authorize('admin', 'doctor', 'receptionist'), followUpController.listByConsultation);

module.exports = { mainRouter, patientRouter, consultationRouter };