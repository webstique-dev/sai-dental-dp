const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const medicineController = require('../controllers/medicine.controllers');
const batchController = require('../controllers/batch.controllers');

// Pharmacy inventory management.
const mainRouter = express.Router({ mergeParams: true });
mainRouter.get('/medicines', protect, authorize('admin', 'pharmacy', 'doctor', 'receptionist'), medicineController.list);
mainRouter.post('/medicines', protect, authorize('admin', 'pharmacy'), medicineController.create);
mainRouter.get('/medicines/search', protect, authorize('admin', 'pharmacy', 'doctor', 'receptionist'), medicineController.search);
mainRouter.get('/medicines/:id', protect, authorize('admin', 'pharmacy', 'doctor', 'receptionist'), medicineController.get);
mainRouter.patch('/medicines/:id', protect, authorize('admin', 'pharmacy'), medicineController.update);
mainRouter.delete('/medicines/:id', protect, authorize('admin', 'pharmacy'), medicineController.remove);
mainRouter.post('/medicines/:id/restore', protect, authorize('admin'), medicineController.restore);
mainRouter.post('/medicines/:id/stock-in', protect, authorize('admin', 'pharmacy'), medicineController.addStock);
mainRouter.post('/medicines/:id/stock-out', protect, authorize('admin', 'pharmacy'), medicineController.removeStock);

// Scoped batch + ledger endpoints: GET /api/medicines/:id/batches etc.
const medicineRouter = express.Router({ mergeParams: true });
medicineRouter.get('/batches', protect, authorize('admin', 'pharmacy', 'doctor', 'receptionist'), batchController.listForMedicine);
medicineRouter.post('/batches', protect, authorize('admin', 'pharmacy'), batchController.create);
medicineRouter.get('/stock-movements', protect, authorize('admin', 'pharmacy'), batchController.movements);
medicineRouter.get('/transactions', protect, authorize('admin', 'pharmacy'), medicineController.listTransactions);

module.exports = { mainRouter, medicineRouter };