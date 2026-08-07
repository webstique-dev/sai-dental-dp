const express = require('express');
const appointmentController = require('../controllers/appointment.controllers');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', authorize('admin', 'doctor', 'receptionist'), appointmentController.create);
router.get('/', authorize('admin', 'doctor', 'receptionist'), appointmentController.list);

module.exports = router;