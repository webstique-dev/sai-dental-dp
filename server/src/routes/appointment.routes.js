const express = require('express');
const appointmentController = require('../controllers/appointment.controllers');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', authorize('admin', 'doctor', 'receptionist'), appointmentController.create);
router.get('/', authorize('admin', 'doctor', 'receptionist'), appointmentController.list);
router.get('/:id', authorize('admin', 'doctor', 'receptionist'), appointmentController.getById);
router.patch('/:id', authorize('admin', 'doctor', 'receptionist'), appointmentController.update);
router.post('/:id/cancel', authorize('admin', 'doctor', 'receptionist'), appointmentController.cancel);

module.exports = router;