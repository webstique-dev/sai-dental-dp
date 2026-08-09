const asyncHandler = require('../utils/asyncHandler');
const invoiceService = require('../services/invoice.service');
const paymentService = require('../services/payment.service');

const create = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.create(req.body, req.user);
  res.status(201).json({ success: true, message: 'Invoice created', invoice });
});

const get = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.get(req.params.id, req.user);
  res.status(200).json({ success: true, invoice });
});

const list = asyncHandler(async (req, res) => {
  const invoices = await invoiceService.list(req.query);
  res.status(200).json({ success: true, invoices });
});

const listByPatient = asyncHandler(async (req, res) => {
  const invoices = await invoiceService.list({ patientId: req.params.patientId });
  res.status(200).json({ success: true, invoices });
});

const listByVisit = asyncHandler(async (req, res) => {
  const invoices = await invoiceService.listByVisit(req.params.visitId);
  res.status(200).json({ success: true, invoices });
});

const update = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.update(req.params.id, req.body, req.user);
  res.status(200).json({ success: true, message: 'Invoice updated', invoice });
});

const addItem = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.addItem(req.params.id, req.body, req.user);
  res.status(201).json({ success: true, message: 'Invoice line added', invoice });
});

const removeItem = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.removeItem(req.params.id, req.params.itemId, req.user);
  res.status(200).json({ success: true, message: 'Invoice line removed', invoice });
});

const finalize = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.finalize(req.params.id, req.user);
  res.status(200).json({ success: true, message: 'Invoice finalized', invoice });
});

const cancel = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.cancel(req.params.id, (req.body && req.body.reason) || '', req.user);
  res.status(200).json({ success: true, message: 'Invoice cancelled', invoice });
});

const print = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.getPrintView(req.params.id, req.user);
  res.status(200).json({ success: true, invoice });
});

// Payments nested under an invoice
const addPayment = asyncHandler(async (req, res) => {
  const payment = await paymentService.createForInvoice(req.params.id, req.body, req.user);
  res.status(201).json({ success: true, message: 'Payment recorded', payment });
});

const listPayments = asyncHandler(async (req, res) => {
  const payments = await paymentService.listByInvoice(req.params.id);
  res.status(200).json({ success: true, payments });
});

module.exports = {
  create,
  get,
  list,
  listByPatient,
  listByVisit,
  update,
  addItem,
  removeItem,
  finalize,
  cancel,
  print,
  addPayment,
  listPayments,
};