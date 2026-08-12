const Payment = require('../models/Payment');
const { PAYMENT_METHODS } = Payment;
const Invoice = require('../models/Invoice');
const { nextPaymentNumber } = require('../models/Counter');
const { recordAudit } = require('../utils/audit');
const ApiError = require('../utils/ApiError');
const { toPaise, toRupees } = require('../utils/money');

function paymentMethod(payload) {
  return payload && payload.method && PAYMENT_METHODS.includes(payload.method) ? payload.method : 'cash';
}

function sanitize(doc) {
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    id: d._id,
    paymentNumber: d.paymentNumber,
    type: d.type,
    invoice: d.invoice,
    patient: d.patient,
    visit: d.visit,
    amount: toRupees(d.amountPaise),
    amountPaise: d.amountPaise,
    method: d.method,
    reference: d.reference || '',
    paymentDate: d.paymentDate,
    notes: d.notes || '',
    receivedBy: d.receivedBy,
    createdAt: d.createdAt,
  };
}

const baseQuery = (id) =>
  Payment.findOne({ _id: id, isArchived: false, isDeleted: { $ne: true } })
    .populate('invoice', 'invoiceNumber status paymentStatus totalPaise balancePaise')
    .populate('patient', 'firstName lastName patientId phone')
    .populate('visit', 'opNumber')
    .populate('receivedBy', 'name');

async function loadActiveInvoice(invoiceId) {
  const invoice = await Invoice.findOne({ _id: invoiceId, isArchived: false, isDeleted: { $ne: true } });
  if (!invoice) throw new ApiError(404, 'Invoice not found');
  return invoice;
}

async function removePayment(id, actor) {
  const doc = await Payment.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new ApiError(404, 'Payment not found');

  doc.isDeleted = true;
  doc.deletedAt = new Date();
  if (actor && actor._id) doc.deletedBy = actor._id;
  await doc.save();

  await recordAudit({
    user: actor,
    action: 'delete',
    entity: 'payment',
    entityId: doc._id,
    description: `Payment ${doc.paymentNumber} soft deleted`,
  });

  return { success: true, message: 'Record deleted successfully.' };
}

async function restorePayment(id, actor) {
  const doc = await Payment.findById(id);
  if (!doc) throw new ApiError(404, 'Payment not found');

  doc.isDeleted = false;
  doc.deletedAt = null;
  doc.deletedBy = null;
  await doc.save();

  return sanitize(await baseQuery(id));
}

async function list({ patientId, invoiceId, from, to, limit } = {}) {
  const query = { isArchived: false, isDeleted: { $ne: true } };
  if (patientId) query.patient = patientId;
  if (invoiceId) query.invoice = invoiceId;
  if (from || to) {
    query.paymentDate = {};
    if (from) query.paymentDate.$gte = new Date(from);
    if (to) query.paymentDate.$lte = new Date(to);
  }
  const maxLimit = Math.min(Number(limit) || 100, 500);
  const docs = await Payment.find(query)
    .sort({ paymentDate: -1, createdAt: -1 })
    .limit(maxLimit)
    .populate('invoice', 'invoiceNumber status')
    .populate('patient', 'firstName lastName patientId phone');
  return docs.map(sanitize);
}

async function listByInvoice(invoiceId) {
  return list({ invoiceId });
}

async function listByPatient(patientId) {
  return list({ patientId });
}

// Receipt view: payment + the invoice snapshot it belongs to + patient.
async function receipt(id, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Payment not found');
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    id: doc._id,
    paymentNumber: d.paymentNumber,
    type: d.type,
    amount: toRupees(d.amountPaise),
    method: d.method,
    reference: d.reference || '',
    paymentDate: d.paymentDate,
    notes: d.notes || '',
    invoice: d.invoice,
    patient: d.patient,
    visit: d.visit,
    receivedBy: d.receivedBy,
  };
}

module.exports = {
  createForInvoice,
  createRefundForInvoice,
  get,
  list,
  listByInvoice,
  listByPatient,
  removePayment,
  restorePayment,
  getPrintView: get,
  receipt,
};

// Server-side safety: never trust a client-computed total. The invoice's stored
// totals are authoritative; a payment can never exceed the outstanding balance.
async function createForInvoice(invoiceId, payload, actor) {
  const invoice = await loadActiveInvoice(invoiceId);
  if (invoice.status !== 'finalized') {
    throw new ApiError(409, 'Payments can only be recorded on a finalized invoice.');
  }

  const amountPaise = toPaise(payload && payload.amount);
  if (!Number.isFinite(Number(amountPaise)) || amountPaise <= 0) {
    throw new ApiError(400, 'Payment amount must be greater than zero.');
  }

  // Atomic reservation: reduce the balance only if enough remains. This closes
  // the check-then-write race where two concurrent payments could both pass the
  // aggregate balance check and over-pay the invoice.
  const reserved = await Invoice.findOneAndUpdate(
    { _id: invoice._id, status: 'finalized', balancePaise: { $gte: amountPaise } },
    { $inc: { balancePaise: -amountPaise, amountPaidPaise: amountPaise } },
    { new: true }
  );
  if (!reserved) {
    throw new ApiError(400, `Payment exceeds the outstanding balance of ₹${toRupees(invoice.balancePaise)}.`);
  }

  const doc = await Payment.create({
    paymentNumber: await nextPaymentNumber(),
    type: 'payment',
    invoice: invoice._id,
    patient: invoice.patient,
    visit: invoice.visit,
    amountPaise,
    method: paymentMethod(payload),
    reference: payload && payload.reference ? String(payload.reference).trim() : '',
    paymentDate: (payload && payload.paymentDate) || new Date(),
    notes: payload && payload.notes ? String(payload.notes).trim() : '',
    receivedBy: actor._id,
  });

  invoice.amountPaidPaise = reserved.amountPaidPaise;
  invoice.balancePaise = reserved.balancePaise;
  invoice.paymentStatus = reserved.balancePaise === 0 ? 'paid' : 'partially-paid';
  await invoice.save();

  await recordAudit({
    user: actor,
    action: 'pay',
    entity: 'payment',
    entityId: doc._id,
    description: `Payment of ₹${toRupees(doc.amountPaise)} recorded for invoice ${invoice.invoiceNumber} (${doc.paymentNumber})`,
    meta: { invoice: invoice._id, invoiceNumber: invoice.invoiceNumber, method: doc.method, amountPaise: doc.amountPaise },
  });

  return sanitize(await baseQuery(doc._id));
}

// Refund: records a refund against this invoice. Only supported on invoices
// with recorded payments; total refunded can never exceed total received.
async function createRefundForInvoice(invoiceId, payload, actor) {
  const invoice = await loadActiveInvoice(invoiceId);
  if (invoice.status !== 'finalized') {
    throw new ApiError(409, 'Refunds can only be recorded on a finalized invoice.');
  }

  const amountPaise = toPaise(payload && payload.amount);
  if (!Number.isFinite(Number(amountPaise)) || amountPaise <= 0) {
    throw new ApiError(400, 'Refund amount must be greater than zero.');
  }

  // Atomic reservation: net amount received (amountPaidPaise tracks payments net
  // of refunds) can never go negative, closing the concurrent refund race.
  const reserved = await Invoice.findOneAndUpdate(
    { _id: invoice._id, status: 'finalized', amountPaidPaise: { $gte: amountPaise } },
    { $inc: { amountPaidPaise: -amountPaise, balancePaise: amountPaise } },
    { new: true }
  );
  if (!reserved) {
    throw new ApiError(400, 'Refund amount exceeds the total amount received on this invoice.');
  }

  const doc = await Payment.create({
    paymentNumber: await nextPaymentNumber(),
    type: 'refund',
    invoice: invoice._id,
    patient: invoice.patient,
    visit: invoice.visit,
    amountPaise,
    method: paymentMethod(payload),
    reference: payload && payload.reference ? String(payload.reference).trim() : '',
    paymentDate: (payload && payload.paymentDate) || new Date(),
    notes: payload && payload.notes ? String(payload.notes).trim() : '',
    receivedBy: actor._id,
  });

  invoice.amountPaidPaise = reserved.amountPaidPaise;
  invoice.balancePaise = reserved.balancePaise;
  invoice.paymentStatus = reserved.amountPaidPaise <= 0 ? 'refunded' : reserved.balancePaise === 0 ? 'paid' : 'partially-paid';
  await invoice.save();

  await recordAudit({
    user: actor,
    action: 'refund',
    entity: 'payment',
    entityId: doc._id,
    description: `Refund of ₹${toRupees(doc.amountPaise)} for invoice ${invoice.invoiceNumber} (${doc.paymentNumber})`,
    meta: { invoice: invoice._id, invoiceNumber: invoice.invoiceNumber, amountPaise: doc.amountPaise },
  });

  return sanitize(await baseQuery(doc._id));
}

async function get(id, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Payment not found');
  return sanitize(doc);
}

module.exports = {
  createForInvoice,
  createRefundForInvoice,
  get,
  list,
  listByInvoice,
  listByPatient,
  removePayment,
  restorePayment,
  getPrintView: get,
  receipt,
};