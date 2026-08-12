const express = require('express');
const checkInController = require('../controllers/checkIn.controllers');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/appointment', authorize('admin', 'doctor', 'receptionist'), checkInController.checkInAppointment);
router.post('/walk-in', authorize('admin', 'doctor', 'receptionist'), checkInController.checkInWalkIn);
router.get('/queue', authorize('admin', 'doctor', 'receptionist'), checkInController.getQueue);
router.patch('/queue/:visitId/status', authorize('admin', 'doctor', 'receptionist'), checkInController.updateStatus);

module.exports = router;
