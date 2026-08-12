const express = require('express');
const settingsController = require('../controllers/settings.controllers');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', settingsController.get);
router.patch('/', authorize('admin'), settingsController.update);

module.exports = router;
