const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const invoiceController = require('../controllers/invoice.controllers');
const paymentController = require('../controllers/payment.controllers');

// POST /api/invoices (create), GET /api/invoices (list)
const mainRouter = express.Router({ mergeParams: true });
mainRouter.get('/invoices', protect, authorize('admin', 'doctor', 'receptionist'), invoiceController.list);
mainRouter.post('/invoices', protect, authorize('admin', 'receptionist'), invoiceController.create);
mainRouter.get('/invoices/:id', protect, authorize('admin', 'doctor', 'receptionist'), invoiceController.get);
mainRouter.patch('/invoices/:id', protect, authorize('admin', 'receptionist'), invoiceController.update);
mainRouter.delete('/invoices/:id', protect, authorize('admin', 'receptionist'), invoiceController.remove);
mainRouter.post('/invoices/:id/restore', protect, authorize('admin'), invoiceController.restore);
mainRouter.post('/invoices/:id/items', protect, authorize('admin', 'doctor', 'receptionist'), invoiceController.addItem);
mainRouter.delete('/invoices/:id/items/:itemId', protect, authorize('admin', 'receptionist'), invoiceController.removeItem);
mainRouter.post('/invoices/:id/finalize', protect, authorize('admin', 'receptionist'), invoiceController.finalize);
mainRouter.post('/invoices/:id/cancel', protect, authorize('admin', 'receptionist'), invoiceController.cancel);
mainRouter.get('/invoices/:id/print', protect, authorize('admin', 'doctor', 'receptionist'), invoiceController.print);
mainRouter.get('/invoices/:id/payments', protect, authorize('admin', 'doctor', 'receptionist'), invoiceController.listPayments);
mainRouter.post('/invoices/:id/payments', protect, authorize('admin', 'receptionist'), invoiceController.addPayment);
mainRouter.post('/invoices/:id/refund', protect, authorize('admin', 'receptionist'), paymentController.refund);

// GET /api/patients/:patientId/invoices
const patientRouter = express.Router({ mergeParams: true });
patientRouter.get('/', protect, authorize('admin', 'doctor', 'receptionist'), invoiceController.listByPatient);

// GET /api/op-visits/:opVisitId/invoices
const visitRouter = express.Router({ mergeParams: true });
visitRouter.get('/', protect, authorize('admin', 'doctor', 'receptionist'), (req, res, next) => {
  req.params.visitId = req.params.opVisitId;
  return invoiceController.listByVisit(req, res, next);
});

// Payments module
mainRouter.get('/payments', protect, authorize('admin', 'doctor', 'receptionist'), paymentController.list);
mainRouter.get('/payments/:id', protect, authorize('admin', 'doctor', 'receptionist'), paymentController.get);
mainRouter.delete('/payments/:id', protect, authorize('admin', 'receptionist'), paymentController.remove);
mainRouter.post('/payments/:id/restore', protect, authorize('admin'), paymentController.restore);
mainRouter.get('/payments/:id/receipt', protect, authorize('admin', 'doctor', 'receptionist'), paymentController.receipt);

module.exports = { mainRouter, patientRouter, visitRouter };