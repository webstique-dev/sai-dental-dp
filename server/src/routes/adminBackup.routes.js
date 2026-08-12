const express = require('express');
const adminBackupController = require('../controllers/adminBackup.controllers');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/backup/export', adminBackupController.exportBackup);
router.get('/audit-logs', adminBackupController.listAuditLogs);
router.get('/deleted-records', adminBackupController.listDeletedRecords);
router.post('/restore/:entity/:id', adminBackupController.restoreRecord);

module.exports = router;
