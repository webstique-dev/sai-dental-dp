const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const treatmentPlanController = require('../controllers/treatmentPlan.controllers');

// POST /api/treatment-plans (create, admin/doctor)
const mainRouter = express.Router({ mergeParams: true });
mainRouter.post('/treatment-plans', protect, authorize('admin', 'doctor'), treatmentPlanController.create);
mainRouter.get('/treatment-plans/:id', protect, authorize('admin', 'doctor', 'receptionist'), treatmentPlanController.get);
mainRouter.patch('/treatment-plans/:id', protect, authorize('admin', 'doctor'), treatmentPlanController.update);
mainRouter.delete('/treatment-plans/:id', protect, authorize('admin', 'doctor'), treatmentPlanController.remove);
mainRouter.post('/treatment-plans/:id/restore', protect, authorize('admin'), treatmentPlanController.restore);
mainRouter.post('/treatment-plans/:id/items', protect, authorize('admin', 'doctor'), treatmentPlanController.addItem);
mainRouter.patch('/treatment-plans/:id/items/:itemId', protect, authorize('admin', 'doctor'), treatmentPlanController.updateItem);
mainRouter.delete('/treatment-plans/:id/items/:itemId', protect, authorize('admin', 'doctor'), treatmentPlanController.removeItem);
mainRouter.post('/treatment-plans/:id/approve', protect, authorize('admin', 'doctor'), treatmentPlanController.approve);
mainRouter.post('/treatment-plans/:id/decline', protect, authorize('admin', 'doctor'), treatmentPlanController.decline);

// GET /api/patients/:patientId/treatment-plans
const patientRouter = express.Router({ mergeParams: true });
patientRouter.get('/', protect, authorize('admin', 'doctor', 'receptionist'), treatmentPlanController.listByPatient);

module.exports = { mainRouter, patientRouter };
