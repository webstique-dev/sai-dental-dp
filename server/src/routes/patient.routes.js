const express = require('express');
const patientController = require('../controllers/patient.controllers');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/check-duplicate', authorize('admin', 'doctor', 'receptionist'), patientController.checkDuplicate);
router.post('/', authorize('admin', 'doctor', 'receptionist'), patientController.create);
router.get('/', authorize('admin', 'doctor', 'receptionist'), patientController.list);
router.get('/:id', authorize('admin', 'doctor', 'receptionist'), patientController.getById);
router.patch('/:id', authorize('admin', 'doctor', 'receptionist'), patientController.update);
router.delete('/:id', authorize('admin', 'doctor', 'receptionist'), patientController.remove);
router.post('/:id/restore', authorize('admin'), patientController.restore);

module.exports = router;