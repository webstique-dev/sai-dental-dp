const express = require('express');
const userController = require('../controllers/user.controllers');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', authorize('admin'), userController.list);
router.post('/', authorize('admin'), userController.create);
router.get('/:id', authorize('admin'), userController.get);
router.patch('/:id', authorize('admin'), userController.update);
router.post('/:id/toggle-active', authorize('admin'), userController.toggleActive);
router.post('/:id/reset-password', authorize('admin'), userController.resetPassword);
router.delete('/:id', authorize('admin'), userController.remove);
router.post('/:id/restore', authorize('admin'), userController.restore);

module.exports = router;
