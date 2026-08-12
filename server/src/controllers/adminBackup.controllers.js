const asyncHandler = require('../utils/asyncHandler');
const adminBackupService = require('../services/adminBackup.service');

const exportBackup = asyncHandler(async (req, res) => {
  const backupData = await adminBackupService.exportDatabaseBackup(req.user);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=sai-dental-backup-${new Date().toISOString().split('T')[0]}.json`);
  res.status(200).send(JSON.stringify(backupData, null, 2));
});

const listAuditLogs = asyncHandler(async (req, res) => {
  const logs = await adminBackupService.listAuditLogs(req.query);
  res.status(200).json({ success: true, logs });
});

module.exports = { exportBackup, listAuditLogs };
