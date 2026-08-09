const express = require('express');
const toothChartController = require('../controllers/toothChart.controllers');
const { protect, authorize } = require('../middleware/auth');

// Mounted at /api/patients/:patientId/tooth-chart
// mergeParams exposes the parent :patientId param in req.params.
const router = express.Router({ mergeParams: true });

router.use(protect);

// Read-only endpoints (receptionist can view chart/history but not edit).
router.get('/', authorize('admin', 'doctor', 'receptionist'), toothChartController.list);
router.get('/:toothNumber', authorize('admin', 'doctor', 'receptionist'), toothChartController.getTooth);
router.get('/:toothNumber/history', authorize('admin', 'doctor', 'receptionist'), toothChartController.history);

// Clinical editing endpoints.
router.post('/:toothNumber/findings', authorize('admin', 'doctor'), toothChartController.addFinding);
router.post('/:toothNumber/treatments', authorize('admin', 'doctor'), toothChartController.addTreatment);
router.patch('/:toothNumber', authorize('admin', 'doctor'), toothChartController.updateTooth);

module.exports = router;