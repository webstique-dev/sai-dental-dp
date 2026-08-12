const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const investigationController = require('../controllers/investigation.controllers');

// POST /api/investigations etc.
const mainRouter = express.Router({ mergeParams: true });
mainRouter.post('/investigations', protect, authorize('admin', 'doctor'), investigationController.create);
mainRouter.get('/investigations/:id', protect, authorize('admin', 'doctor'), investigationController.get);
mainRouter.patch('/investigations/:id', protect, authorize('admin', 'doctor'), investigationController.update);
mainRouter.delete('/investigations/:id', protect, authorize('admin', 'doctor'), investigationController.remove);
mainRouter.post('/investigations/:id/restore', protect, authorize('admin'), investigationController.restore);
mainRouter.post('/investigations/:id/result', protect, authorize('admin', 'doctor'), investigationController.addResult);
mainRouter.patch('/investigations/:id/result', protect, authorize('admin', 'doctor'), investigationController.addResult);
mainRouter.post('/investigations/:id/attachments', protect, authorize('admin', 'doctor'), investigationController.addAttachment);

// GET /api/consultations/:consultationId/investigations
const consultationRouter = express.Router({ mergeParams: true });
consultationRouter.get('/', protect, authorize('admin', 'doctor'), investigationController.listByConsultation);

// GET /api/patients/:patientId/investigations
const patientRouter = express.Router({ mergeParams: true });
patientRouter.get('/', protect, authorize('admin', 'doctor'), investigationController.listByPatient);

module.exports = { mainRouter, consultationRouter, patientRouter };