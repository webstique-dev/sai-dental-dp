const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const followUpController = require('../controllers/followUp.controllers');

// Main follow-up routes
const mainRouter = express.Router({ mergeParams: true });
mainRouter.post('/follow-ups', protect, authorize('admin', 'doctor'), followUpController.create);
mainRouter.get('/follow-ups/upcoming', protect, authorize('admin', 'doctor'), followUpController.listUpcoming);
mainRouter.get('/follow-ups/:id', protect, authorize('admin', 'doctor'), followUpController.get);
mainRouter.patch('/follow-ups/:id', protect, authorize('admin', 'doctor'), followUpController.update);
mainRouter.post('/follow-ups/:id/schedule', protect, authorize('admin', 'doctor'), followUpController.schedule);
mainRouter.post('/follow-ups/:id/complete', protect, authorize('admin', 'doctor'), followUpController.complete);
mainRouter.post('/follow-ups/:id/cancel', protect, authorize('admin', 'doctor'), followUpController.cancel);
mainRouter.delete('/follow-ups/:id', protect, authorize('admin', 'doctor'), followUpController.remove);
mainRouter.post('/follow-ups/:id/restore', protect, authorize('admin'), followUpController.restore);

// GET /api/patients/:patientId/follow-ups
const patientRouter = express.Router({ mergeParams: true });
patientRouter.get('/', protect, authorize('admin', 'doctor'), followUpController.listByPatient);

// GET /api/consultations/:consultationId/follow-ups
const consultationRouter = express.Router({ mergeParams: true });
consultationRouter.get('/', protect, authorize('admin', 'doctor'), followUpController.listByConsultation);

module.exports = { mainRouter, patientRouter, consultationRouter };