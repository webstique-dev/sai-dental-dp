const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.status(200).json({ success: true, message: 'Login successful', ...result });
});

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json({ success: true, message: 'Account created successfully', ...result });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const result = await authService.changePassword(req.user._id, { currentPassword, newPassword });
  res.status(200).json({ success: true, message: 'Password updated successfully', ...result });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refresh(refreshToken);
  res.status(200).json({ success: true, message: 'Session refreshed', ...result });
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user._id);
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

const me = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, user: req.user.toSafeJSON() });
});

module.exports = { login, register, changePassword, refresh, logout, me };