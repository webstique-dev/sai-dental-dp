const express = require('express');
const consultationController = require('../controllers/consultation.controllers');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', authorize('admin', 'doctor'), consultationController.create);
router.get('/:id', authorize('admin', 'doctor', 'receptionist'), consultationController.getById);
router.patch('/:id', authorize('admin', 'doctor'), consultationController.update);
router.post('/:id/complete', authorize('admin', 'doctor'), consultationController.complete);

module.exports = router;