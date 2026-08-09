const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const batchController = require('../controllers/batch.controllers');

// Medicine batch management: POST /api/medicine-batches etc.
const mainRouter = express.Router({ mergeParams: true });
mainRouter.get('/', protect, authorize('admin', 'pharmacy', 'doctor', 'receptionist'), batchController.list);
mainRouter.post('/', protect, authorize('admin', 'pharmacy'), batchController.create);
mainRouter.get('/:id', protect, authorize('admin', 'pharmacy', 'doctor', 'receptionist'), batchController.get);
mainRouter.patch('/:id', protect, authorize('admin', 'pharmacy'), batchController.update);
mainRouter.post('/:id/receive', protect, authorize('admin', 'pharmacy'), batchController.receive);
mainRouter.post('/:id/adjust', protect, authorize('admin', 'pharmacy'), batchController.adjust);

module.exports = { mainRouter };