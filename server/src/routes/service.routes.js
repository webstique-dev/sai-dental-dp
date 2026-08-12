const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const serviceController = require('../controllers/service.controllers');

const mainRouter = express.Router({ mergeParams: true });
mainRouter.get('/services', protect, authorize('admin', 'doctor', 'receptionist'), serviceController.list);
mainRouter.post('/services', protect, authorize('admin'), serviceController.create);
mainRouter.get('/services/:id', protect, authorize('admin', 'doctor', 'receptionist'), serviceController.get);
mainRouter.patch('/services/:id', protect, authorize('admin'), serviceController.update);
mainRouter.delete('/services/:id', protect, authorize('admin'), serviceController.remove);
mainRouter.post('/services/:id/restore', protect, authorize('admin'), serviceController.restore);

module.exports = { mainRouter };