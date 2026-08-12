const asyncHandler = require('../utils/asyncHandler');
const userService = require('../services/user.service');

const list = asyncHandler(async (req, res) => {
  const users = await userService.listUsers(req.query);
  res.status(200).json({ success: true, users });
});

const get = asyncHandler(async (req, res) => {
  const user = await userService.getUser(req.params.id);
  res.status(200).json({ success: true, user });
});

const create = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body, req.user);
  res.status(201).json({ success: true, message: 'Staff account created successfully', user });
});

const update = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body, req.user);
  res.status(200).json({ success: true, message: 'Staff account updated successfully', user });
});

const toggleActive = asyncHandler(async (req, res) => {
  const user = await userService.toggleActive(req.params.id, req.user);
  res.status(200).json({ success: true, message: `Account ${user.isActive ? 'activated' : 'deactivated'}`, user });
});

const resetPassword = asyncHandler(async (req, res) => {
  const user = await userService.resetPassword(req.params.id, req.body.newPassword, req.user);
  res.status(200).json({ success: true, message: 'Password reset successfully', user });
});

const remove = asyncHandler(async (req, res) => {
  const result = await userService.deleteUser(req.params.id, req.user);
  res.status(200).json({ success: true, message: result.message });
});

const restore = asyncHandler(async (req, res) => {
  const user = await userService.restoreUser(req.params.id, req.user);
  res.status(200).json({ success: true, message: 'Staff account restored successfully.', user });
});

module.exports = { list, get, create, update, toggleActive, resetPassword, remove, restore };
