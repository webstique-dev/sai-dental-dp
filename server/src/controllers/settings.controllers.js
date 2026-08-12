const asyncHandler = require('../utils/asyncHandler');
const settingsService = require('../services/settings.service');

const get = asyncHandler(async (req, res) => {
  const settings = await settingsService.getSettings();
  res.status(200).json({ success: true, settings });
});

const update = asyncHandler(async (req, res) => {
  const settings = await settingsService.updateSettings(req.body, req.user);
  res.status(200).json({ success: true, message: 'Clinic settings updated successfully', settings });
});

module.exports = { get, update };
