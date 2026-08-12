const express = require('express');
const appointmentController = require('../controllers/appointment.controllers');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', authorize('admin', 'receptionist'), appointmentController.create);
router.get('/', authorize('admin', 'doctor', 'receptionist'), appointmentController.list);
router.get('/:id', authorize('admin', 'doctor', 'receptionist'), appointmentController.getById);
router.patch('/:id', authorize('admin', 'receptionist'), appointmentController.update);
router.post('/:id/cancel', authorize('admin', 'receptionist'), appointmentController.cancel);
router.delete('/:id', authorize('admin', 'receptionist'), appointmentController.remove);
router.post('/:id/restore', authorize('admin'), appointmentController.restore);

module.exports = router;