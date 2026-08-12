const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const treatmentRecordController = require('../controllers/treatmentRecord.controllers');

// POST /api/treatment-records (create, admin/doctor)
const mainRouter = express.Router({ mergeParams: true });
mainRouter.post('/treatment-records', protect, authorize('admin', 'doctor'), treatmentRecordController.create);
mainRouter.get('/treatment-records/:id', protect, authorize('admin', 'doctor'), treatmentRecordController.get);
mainRouter.patch('/treatment-records/:id', protect, authorize('admin', 'doctor'), treatmentRecordController.update);
mainRouter.post('/treatment-records/:id/complete', protect, authorize('admin', 'doctor'), treatmentRecordController.complete);
mainRouter.post('/treatment-records/:id/cancel', protect, authorize('admin', 'doctor'), treatmentRecordController.cancel);
mainRouter.delete('/treatment-records/:id', protect, authorize('admin', 'doctor'), treatmentRecordController.remove);
mainRouter.post('/treatment-records/:id/restore', protect, authorize('admin'), treatmentRecordController.restore);

// GET /api/patients/:patientId/treatment-records
const patientRouter = express.Router({ mergeParams: true });
patientRouter.get('/', protect, authorize('admin', 'doctor'), treatmentRecordController.listByPatient);

// GET /api/consultations/:consultationId/treatment-records
const consultationRouter = express.Router({ mergeParams: true });
consultationRouter.get('/', protect, authorize('admin', 'doctor'), treatmentRecordController.listByConsultation);

// GET /api/treatment-plans/:planId/treatment-records
const planRouter = express.Router({ mergeParams: true });
planRouter.get('/', protect, authorize('admin', 'doctor'), treatmentRecordController.listByPlan);

module.exports = { mainRouter, patientRouter, consultationRouter, planRouter };