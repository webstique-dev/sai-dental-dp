const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const inventoryController = require('../controllers/inventory.controllers');

// Inventory reports + stock movements: GET /api/inventory/*
const mainRouter = express.Router({ mergeParams: true });
mainRouter.get('/summary', protect, authorize('admin', 'pharmacy', 'doctor', 'receptionist'), inventoryController.summary);
mainRouter.get('/low-stock', protect, authorize('admin', 'pharmacy'), inventoryController.lowStock);
mainRouter.get('/out-of-stock', protect, authorize('admin', 'pharmacy'), inventoryController.outOfStock);
mainRouter.get('/expiring', protect, authorize('admin', 'pharmacy'), inventoryController.expiring);
mainRouter.get('/expired', protect, authorize('admin', 'pharmacy'), inventoryController.expired);
mainRouter.get('/movements', protect, authorize('admin', 'pharmacy'), inventoryController.movements);

// Stock returns (record + authorized confirmation)
mainRouter.post('/returns', protect, authorize('admin', 'pharmacy'), inventoryController.createReturn);
mainRouter.post('/returns/:id/confirm', protect, authorize('admin', 'pharmacy'), inventoryController.confirmReturn);
mainRouter.post('/returns/:id/cancel', protect, authorize('admin', 'pharmacy'), inventoryController.cancelReturn);

module.exports = { mainRouter };