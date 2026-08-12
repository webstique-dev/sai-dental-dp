const asyncHandler = require('../utils/asyncHandler');
const paymentService = require('../services/payment.service');

const get = asyncHandler(async (req, res) => {
  const payment = await paymentService.get(req.params.id, req.user);
  res.status(200).json({ success: true, payment });
});

const list = asyncHandler(async (req, res) => {
  const payments = await paymentService.list(req.query);
  res.status(200).json({ success: true, payments });
});

const listByInvoice = asyncHandler(async (req, res) => {
  const payments = await paymentService.list({ invoiceId: req.params.invoiceId });
  res.status(200).json({ success: true, payments });
});

const listByPatient = asyncHandler(async (req, res) => {
  const payments = await paymentService.list({ patientId: req.params.patientId });
  res.status(200).json({ success: true, payments });
});

const refund = asyncHandler(async (req, res) => {
  const payment = await paymentService.createRefundForInvoice(req.params.id, req.body, req.user);
  res.status(201).json({ success: true, message: 'Refund recorded', payment });
});

const receipt = asyncHandler(async (req, res) => {
  const receipt = await paymentService.receipt(req.params.id, req.user);
  res.status(200).json({ success: true, receipt });
});

const remove = asyncHandler(async (req, res) => {
  const result = await paymentService.removePayment(req.params.id, req.user);
  res.status(200).json({ success: true, message: result.message });
});

const restore = asyncHandler(async (req, res) => {
  const payment = await paymentService.restorePayment(req.params.id, req.user);
  res.status(200).json({ success: true, message: 'Payment restored successfully.', payment });
});

module.exports = { get, list, listByInvoice, listByPatient, refund, receipt, remove, restore };