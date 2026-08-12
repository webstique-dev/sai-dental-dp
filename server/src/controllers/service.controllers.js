const asyncHandler = require('../utils/asyncHandler');
const serviceService = require('../services/service.service');

const create = asyncHandler(async (req, res) => {
  const service = await serviceService.create(req.body, req.user);
  res.status(201).json({ success: true, message: 'Service created', service });
});

const list = asyncHandler(async (req, res) => {
  const services = await serviceService.list(req.query);
  res.status(200).json({ success: true, services });
});

const get = asyncHandler(async (req, res) => {
  const service = await serviceService.get(req.params.id, req.user);
  res.status(200).json({ success: true, service });
});

const update = asyncHandler(async (req, res) => {
  const service = await serviceService.update(req.params.id, req.body, req.user);
  res.status(200).json({ success: true, message: 'Service updated', service });
});

const remove = asyncHandler(async (req, res) => {
  const result = await serviceService.removeService(req.params.id, req.user);
  res.status(200).json({ success: true, message: result.message });
});

const restore = asyncHandler(async (req, res) => {
  const service = await serviceService.restoreService(req.params.id, req.user);
  res.status(200).json({ success: true, message: 'Service restored successfully.', service });
});

module.exports = { create, list, get, update, remove, restore };