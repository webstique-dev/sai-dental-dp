const express = require('express');
const patientController = require('../controllers/patient.controllers');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', authorize('admin', 'doctor', 'receptionist'), patientController.create);
router.get('/', authorize('admin', 'doctor', 'receptionist'), patientController.list);
router.get('/:id', authorize('admin', 'doctor', 'receptionist'), patientController.getById);

module.exports = router;