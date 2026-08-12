const express = require('express');
const reportsController = require('../controllers/reports.controllers');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/receptionist-summary', authorize('admin', 'receptionist', 'doctor'), reportsController.getReceptionistSummary);
router.get('/pharmacy', authorize('admin', 'pharmacy', 'doctor', 'receptionist'), reportsController.getPharmacySummary);
router.get('/analytics', authorize('admin', 'doctor', 'receptionist'), reportsController.getExecutiveAnalytics);

// Analytics report series (shared by dashboard + reports page)
router.get('/dashboard', authorize('admin', 'receptionist', 'doctor', 'pharmacy'), reportsController.getDashboardAnalytics);
router.get('/sales', authorize('admin', 'receptionist', 'doctor'), reportsController.getSalesReport);
router.get('/purchases', authorize('admin', 'receptionist', 'doctor', 'pharmacy'), reportsController.getPurchaseReport);
router.get('/inventory', authorize('admin', 'receptionist', 'doctor', 'pharmacy'), reportsController.getInventoryReport);
router.get('/profit', authorize('admin', 'receptionist', 'doctor'), reportsController.getProfitReport);
router.get('/products', authorize('admin', 'receptionist', 'doctor', 'pharmacy'), reportsController.getProductReport);
router.get('/customers', authorize('admin', 'receptionist', 'doctor'), reportsController.getCustomerReport);
router.get('/suppliers', authorize('admin', 'receptionist', 'doctor', 'pharmacy'), reportsController.getSupplierReport);
router.get('/clinical', authorize('admin', 'receptionist', 'doctor'), reportsController.getClinicalReport);
router.get('/series', authorize('admin', 'receptionist', 'doctor'), reportsController.getAnalyticsSeries);
router.get('/activity', authorize('admin', 'receptionist', 'doctor', 'pharmacy'), reportsController.getRecentActivity);

module.exports = router;
