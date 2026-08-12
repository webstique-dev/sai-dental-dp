const express = require('express');
const reportsController = require('../controllers/reports.controllers');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/receptionist-summary', authorize('admin', 'receptionist', 'doctor'), reportsController.getReceptionistSummary);
router.get('/pharmacy', authorize('admin', 'pharmacy', 'doctor'), reportsController.getPharmacySummary);
router.get('/analytics', authorize('admin', 'doctor'), reportsController.getExecutiveAnalytics);

// Analytics report series (shared by dashboard + reports page)
router.get('/dashboard', authorize('admin', 'receptionist', 'doctor', 'pharmacy'), reportsController.getDashboardAnalytics);
router.get('/sales', authorize('admin', 'doctor'), reportsController.getSalesReport);
router.get('/purchases', authorize('admin', 'pharmacy', 'doctor'), reportsController.getPurchaseReport);
router.get('/inventory', authorize('admin', 'pharmacy', 'doctor'), reportsController.getInventoryReport);
router.get('/profit', authorize('admin', 'doctor'), reportsController.getProfitReport);
router.get('/products', authorize('admin', 'pharmacy', 'doctor'), reportsController.getProductReport);
router.get('/customers', authorize('admin', 'doctor'), reportsController.getCustomerReport);
router.get('/suppliers', authorize('admin', 'pharmacy', 'doctor'), reportsController.getSupplierReport);
router.get('/clinical', authorize('admin', 'doctor'), reportsController.getClinicalReport);
router.get('/series', authorize('admin', 'doctor'), reportsController.getAnalyticsSeries);
router.get('/activity', authorize('admin', 'doctor', 'pharmacy'), reportsController.getRecentActivity);

module.exports = router;
