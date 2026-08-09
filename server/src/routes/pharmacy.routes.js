const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const pharmacyController = require('../controllers/pharmacy.controllers');

// Pharmacy / dispensary: dispensing queue + dashboard summary.
const mainRouter = express.Router({ mergeParams: true });
mainRouter.get('/pharmacy/pending', protect, authorize('admin', 'pharmacy'), pharmacyController.listPending);
mainRouter.get('/pharmacy/prescriptions/:id', protect, authorize('admin', 'pharmacy'), pharmacyController.getDispenseView);
mainRouter.post('/pharmacy/prescriptions/:id/dispense', protect, authorize('admin', 'pharmacy'), pharmacyController.dispense);
mainRouter.get('/pharmacy/summary', protect, authorize('admin', 'pharmacy'), pharmacyController.summary);

module.exports = { mainRouter };