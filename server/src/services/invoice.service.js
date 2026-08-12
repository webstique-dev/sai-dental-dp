const Invoice = require('../models/Invoice');
const { INVOICE_STATUSES, INVOICE_PAYMENT_STATUSES, DISCOUNT_TYPES } = Invoice;
const Payment = require('../models/Payment');
const Service = require('../models/Service');
const Patient = require('../models/Patient');
const { Visit } = require('../models/Visit');
const { Consultation } = require('../models/Consultation');
const TreatmentRecord = require('../models/TreatmentRecord');
const { nextInvoiceNumber } = require('../models/Counter');
const { recordAudit } = require('../utils/audit');
const ApiError = require('../utils/ApiError');
const { toPaise, toRupees, sumPaise } = require('../utils/money');

function assertStatus(status) {
  if (!INVOICE_STATUSES.includes(status)) throw new ApiError(400, 'Invalid invoice status.');
  return status;
}

async function assertPatient(patientId) {
  const patient = await Patient.findById(patientId);
  if (!patient) throw new ApiError(404, 'Patient not found');
  return patient;
}

async function resolveRefs(payload, patientId) {
  let visit = null;
  if (payload.visitId) {
    visit = await Visit.findById(payload.visitId);
    if (!visit || String(visit.patient) !== String(patientId)) {
      throw new ApiError(400, 'Visit reference must belong to the invoice patient.');
    }
  }
  let consultation = null;
  if (payload.consultationId) {
    consultation = await Consultation.findById(payload.consultationId);
    if (!consultation || String(consultation.patient) !== String(patientId)) {
      throw new ApiError(400, 'Consultation reference must belong to the invoice patient.');
    }
  }
  return { visit, consultation };
}

// Build a single invoice line. Lines are PRICE SNAPSHOTS — unitPricePaise is
// copied from the catalog (or supplied) at the time the line is added, so later
// catalog price changes never mutate existing invoices.
async function buildItem(raw, patientId, actor) {
  if (!raw || typeof raw !== 'object') throw new ApiError(400, 'Invalid invoice line.');
  const d = raw.toObject ? raw.toObject() : raw;

  const qty = d.qty === undefined || d.qty === null || d.qty === '' ? 1 : Number(d.qty);
  if (!Number.isInteger(qty) || qty < 1 || qty > 9999) throw new ApiError(400, 'Quantity must be a positive integer.');

  let name = '';
  let category = 'procedure';
  let unitPricePaise = 0;
  let taxPercent = 0;
  let treatmentRecord = null;
  let service = null;

  if (d.serviceId) {
    service = await Service.findById(d.serviceId);
    if (!service || !service.isActive) throw new ApiError(400, 'Service not found or inactive.');
    name = service.name;
    category = service.category;
    unitPricePaise = toPaise(service.unitPrice);
    taxPercent = Number(service.taxPercent) || 0;
  }

  if (d.treatmentRecordId) {
    treatmentRecord = await TreatmentRecord.findById(d.treatmentRecordId);
    if (!treatmentRecord || treatmentRecord.isArchived) throw new ApiError(404, 'Treatment record not found');
    if (String(treatmentRecord.patient) !== String(patientId)) {
      throw new ApiError(400, 'Treatment record must belong to the invoice patient.');
    }
    if (treatmentRecord.status !== 'completed') {
      throw new ApiError(400, 'Only completed treatments can be billed.');
    }
    // Try to match the completed procedure to a catalog service so its current
    // price snapshot is used. Otherwise a name + unit price must be supplied.
    const matched = await Service.findOne({ name: { $regex: `^${treatmentRecord.procedure.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }, isActive: true });
    if (matched) {
      service = matched;
      name = matched.name;
      category = matched.category;
      unitPricePaise = toPaise(matched.unitPrice);
      taxPercent = Number(matched.taxPercent) || 0;
    } else if (d.serviceId) {
      // serviceId already resolved above; keep it.
    } else {
      name = treatmentRecord.procedure;
      if (d.unitPrice === undefined || d.unitPrice === null || d.unitPrice === '' || !Number.isFinite(Number(d.unitPrice))) {
        throw new ApiError(400, 'No catalog service matches this treatment. Provide a valid unit price.');
      }
      unitPricePaise = toPaise(d.unitPrice);
      if (!Number.isFinite(unitPricePaise) || unitPricePaise < 0) {
        throw new ApiError(400, 'Unit price must be a non-negative number.');
      }
    }
  }

  // Custom / generic line.
  if (!service && !treatmentRecord) {
    name = String((d.name || d.description || '').trim());
    if (!name) throw new ApiError(400, 'Each invoice line requires a service or a name.');
    if (d.unitPrice === undefined || d.unitPrice === null || d.unitPrice === '' || !Number.isFinite(Number(d.unitPrice))) {
      throw new ApiError(400, 'Unit price must be a valid non-negative number.');
    }
    unitPricePaise = toPaise(d.unitPrice);
    if (!Number.isFinite(unitPricePaise) || unitPricePaise < 0) {
      throw new ApiError(400, 'Unit price must be a non-negative number.');
    }
    if (d.category) category = String(d.category).trim();
  }

  if (unitPricePaise === 0) unitPricePaise = 0;

  const toothNumber = Number(d.toothNumber) || 0;
  const hasTooth = Boolean(d.hasTooth) || toothNumber > 0;

  return {
    service: service ? service._id : undefined,
    treatmentRecord: treatmentRecord ? treatmentRecord._id : undefined,
    investigation: d.investigationId ? d.investigationId : undefined,
    toothNumber: hasTooth ? toothNumber : 0,
    hasTooth,
    name,
    description: d.description ? String(d.description).trim() : '',
    category,
    qty,
    unitPricePaise,
    taxPercent,
    sortOrder: Number(d.sortOrder) || 0,
  };
}

function computeTotals(invoice) {
  const items = invoice.items || [];
  const subtotalPaise = sumPaise(items.map((i) => i.unitPricePaise * i.qty));

  let discountPaise = 0;
  const discountType = invoice.discountType || 'none';
  const discountValue = Number(invoice.discountValue) || 0;
  if (discountType === 'fixed') discountPaise = toPaise(discountValue);
  if (discountType === 'percent') {
    if (discountValue > 0 && discountValue <= 100) discountPaise = Math.round((subtotalPaise * discountValue) / 100);
  }
  if (discountPaise > subtotalPaise) discountPaise = subtotalPaise;

  const taxPercent = Number(invoice.taxPercent) || 0;
  const taxablePaise = subtotalPaise - discountPaise;
  const taxPaise = taxPercent > 0 ? Math.round((taxablePaise * taxPercent) / 100) : 0;

  const totalPaise = subtotalPaise - discountPaise + taxPaise;

  return { subtotalPaise, discountPaise, taxPaise, totalPaise };
}

function derivePaymentStatus(paidPaise, totalPaise, hasRefund) {
  if (hasRefund && paidPaise <= 0) return 'refunded';
  if (paidPaise >= totalPaise && totalPaise > 0) return 'paid';
  if (paidPaise > 0) return 'partially-paid';
  return 'unpaid';
}

async function refreshPaidTotals(invoice) {
  const [paidAgg, refundAgg] = await Promise.all([
    Payment.aggregate([
      { $match: { invoice: invoice._id, type: 'payment', isArchived: false } },
      { $group: { _id: null, total: { $sum: '$amountPaise' } } },
    ]),
    Payment.aggregate([
      { $match: { invoice: invoice._id, type: 'refund', isArchived: false } },
      { $group: { _id: null, total: { $sum: '$amountPaise' } } },
    ]),
  ]);
  const paidPaise = (paidAgg[0] && paidAgg[0].total) || 0;
  const refundPaise = (refundAgg[0] && refundAgg[0].total) || 0;
  const netPaid = paidPaise - refundPaise;
  invoice.amountPaidPaise = Math.max(0, netPaid);
  invoice.balancePaise = Math.max(0, invoice.totalPaise - netPaid);
  invoice.paymentStatus = derivePaymentStatus(netPaid, invoice.totalPaise, refundPaise > 0);
  return invoice;
}

const baseQuery = (id) =>
  Invoice.findOne({ _id: id, isArchived: false, isDeleted: { $ne: true } })
    .populate('patient', 'firstName lastName patientId gender phone')
    .populate('visit', 'opNumber')
    .populate('consultation', 'status')
    .populate('doctor', 'name')
    .populate('finalizedBy', 'name')
    .populate('cancelledBy', 'name');

function sanitizeItems(items) {
  return (items || []).map((i) => {
    const d = i.toObject ? i.toObject() : i;
    return {
      id: d._id,
      serviceId: d.service,
      treatmentRecordId: d.treatmentRecord,
      investigationId: d.investigation,
      toothNumber: d.hasTooth ? d.toothNumber : 0,
      hasTooth: d.hasTooth,
      name: d.name,
      description: d.description || '',
      category: d.category,
      qty: d.qty,
      unitPrice: toRupees(d.unitPricePaise),
      taxPercent: d.taxPercent,
      lineTotal: toRupees(d.unitPricePaise * d.qty),
      lineTotalPaise: d.unitPricePaise * d.qty,
      sortOrder: d.sortOrder,
    };
  });
}

function sanitize(doc) {
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    id: d._id,
    invoiceNumber: d.invoiceNumber,
    patient: d.patient,
    visit: d.visit,
    consultation: d.consultation,
    doctor: d.doctor,
    billDate: d.billDate,
    status: d.status,
    paymentStatus: d.paymentStatus,
    items: sanitizeItems(d.items),
    discountType: d.discountType,
    discountValue: d.discountValue,
    taxPercent: d.taxPercent,
    subtotal: toRupees(d.subtotalPaise),
    subtotalPaise: d.subtotalPaise,
    discount: toRupees(d.discountPaise),
    discountPaise: d.discountPaise,
    tax: toRupees(d.taxPaise),
    taxPaise: d.taxPaise,
    total: toRupees(d.totalPaise),
    totalPaise: d.totalPaise,
    amountPaid: toRupees(d.amountPaidPaise),
    amountPaidPaise: d.amountPaidPaise,
    balance: toRupees(d.balancePaise),
    balancePaise: d.balancePaise,
    notes: d.notes || '',
    finalizedAt: d.finalizedAt,
    finalizedBy: d.finalizedBy,
    cancelledAt: d.cancelledAt,
    cancelledBy: d.cancelledBy,
    cancelReason: d.cancelReason || '',
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

async function create(payload, actor) {
  const patient = await assertPatient(payload.patientId);
  const { visit, consultation } = await resolveRefs(payload, payload.patientId);

  const discountType = payload.discountType || 'none';
  if (!DISCOUNT_TYPES.includes(discountType)) throw new ApiError(400, 'Invalid discount type.');
  const discountValue = Number(payload.discountValue) || 0;
  if (discountValue < 0) throw new ApiError(400, 'Discount cannot be negative.');
  if (discountType === 'percent' && discountValue > 100) throw new ApiError(400, 'Percentage discount cannot exceed 100.');
  const taxPercent = Number(payload.taxPercent) || 0;
  if (taxPercent < 0 || taxPercent > 100) throw new ApiError(400, 'Tax percent must be between 0 and 100.');

  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  const items = [];
  for (const raw of rawItems) {
    const item = await buildItem(raw, payload.patientId, actor);
    if (item.name) items.push(item);
  }
  if (items.length === 0) throw new ApiError(400, 'An invoice requires at least one line item.');

  const doc = await Invoice.create({
    invoiceNumber: await nextInvoiceNumber(),
    patient: patient._id,
    visit: visit ? visit._id : null,
    consultation: consultation ? consultation._id : null,
    doctor: payload.doctorId || null,
    billDate: payload.billDate || new Date(),
    status: 'draft',
    paymentStatus: 'unpaid',
    items,
    discountType,
    discountValue,
    taxPercent,
    notes: payload.notes ? String(payload.notes).trim() : '',
    createdBy: actor._id,
  });

  const totals = computeTotals(doc);
  doc.subtotalPaise = totals.subtotalPaise;
  doc.discountPaise = totals.discountPaise;
  doc.taxPaise = totals.taxPaise;
  doc.totalPaise = totals.totalPaise;
  doc.balancePaise = totals.totalPaise;
  doc.amountPaidPaise = 0;
  await doc.save();

  await recordAudit({
    user: actor,
    action: 'create',
    entity: 'invoice',
    entityId: doc._id,
    description: `Invoice ${doc.invoiceNumber} drafted for ${patient.firstName} ${patient.lastName} (₹${toRupees(doc.totalPaise)})`,
    meta: { patient: patient._id, opNumber: visit ? visit.opNumber : undefined, totalPaise: doc.totalPaise, items: items.length },
  });

  return sanitize(await baseQuery(doc._id));
}

async function get(id, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Invoice not found');
  await refreshPaidTotals(doc);
  if (doc.isModified()) await doc.save();
  return sanitize(doc);
}

async function list({ q, patientId, status, paymentStatus, from, to, limit } = {}) {
  const query = { isArchived: false, isDeleted: { $ne: true } };
  if (patientId) query.patient = patientId;
  if (status) {
    assertStatus(status);
    query.status = status;
  }
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (from || to) {
    query.billDate = {};
    if (from) query.billDate.$gte = new Date(from);
    if (to) query.billDate.$lte = new Date(to);
  }
  const maxLimit = Math.min(Number(limit) || 100, 500);

  let docs;
  if (q) {
    const rx = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const byNumber = await Invoice.find({ ...query, invoiceNumber: rx }).limit(maxLimit);
    if (byNumber.length) {
      docs = byNumber;
    } else {
      const patients = await Patient.find({ isDeleted: { $ne: true }, $or: [{ firstName: rx }, { lastName: rx }, { phone: rx }, { patientId: rx }] }).select('_id');
      const ids = patients.map((p) => p._id);
      if (ids.length) query.patient = { $in: ids };
      else query.patient = null;
      docs = await Invoice.find(query).limit(maxLimit);
    }
  } else {
    docs = await Invoice.find(query).limit(maxLimit);
  }

  docs.sort((a, b) => new Date(b.billDate) - new Date(a.billDate));
  const sanitized = [];
  for (const d of docs) {
    const pop = await d.populate('patient', 'firstName lastName patientId gender phone');
    const pop2 = await pop.populate('visit', 'opNumber');
    sanitized.push(sanitize(pop2));
  }
  return sanitized;
}

async function listByVisit(visitId) {
  const docs = await Invoice.find({ visit: visitId, isArchived: false, isDeleted: { $ne: true } })
    .sort({ billDate: -1 })
    .limit(200)
    .populate('patient', 'firstName lastName patientId gender phone')
    .populate('visit', 'opNumber');
  const sanitized = [];
  for (const d of docs) {
    await refreshPaidTotals(d);
    sanitized.push(sanitize(d));
  }
  return sanitized;
}

async function update(id, payload, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Invoice not found');
  if (doc.status === 'finalized') throw new ApiError(409, 'Finalized invoices are locked and cannot be edited.');
  if (doc.status === 'cancelled') throw new ApiError(409, 'Cancelled invoices cannot be edited.');

  if (payload.notes !== undefined) doc.notes = String(payload.notes).trim();
  if (payload.billDate !== undefined) doc.billDate = payload.billDate;
  if (payload.doctorId !== undefined) doc.doctor = payload.doctorId || null;
  if (payload.visitId !== undefined || payload.consultationId !== undefined) {
    const resolved = await resolveRefs({ visitId: payload.visitId, consultationId: payload.consultationId }, doc.patient);
    if (payload.visitId !== undefined) doc.visit = resolved.visit ? resolved.visit._id : null;
    if (payload.consultationId !== undefined) doc.consultation = resolved.consultation ? resolved.consultation._id : null;
  }

  if (payload.discountType !== undefined || payload.discountValue !== undefined || payload.taxPercent !== undefined) {
    if (payload.discountType !== undefined && !DISCOUNT_TYPES.includes(payload.discountType)) {
      throw new ApiError(400, 'Invalid discount type.');
    }
    if (payload.discountType !== undefined) doc.discountType = payload.discountType;
    if (payload.discountValue !== undefined) {
      const dv = Number(payload.discountValue) || 0;
      if (dv < 0) throw new ApiError(400, 'Discount cannot be negative.');
      if (payload.discountType === 'percent' && dv > 100) {
        throw new ApiError(400, 'Percentage discount cannot exceed 100.');
      }
      doc.discountValue = dv;
    }
    if (payload.taxPercent !== undefined) {
      const tp = Number(payload.taxPercent) || 0;
      if (tp < 0 || tp > 100) throw new ApiError(400, 'Tax percent must be between 0 and 100.');
      doc.taxPercent = tp;
    }
  }

  const totals = computeTotals(doc);
  doc.subtotalPaise = totals.subtotalPaise;
  doc.discountPaise = totals.discountPaise;
  doc.taxPaise = totals.taxPaise;
  doc.totalPaise = totals.totalPaise;
  doc.updatedBy = actor._id;
  await doc.save();
  await refreshPaidTotals(doc);
  if (doc.isModified()) await doc.save();

  await recordAudit({
    user: actor,
    action: 'update',
    entity: 'invoice',
    entityId: doc._id,
    description: `Invoice ${doc.invoiceNumber} updated`,
    meta: { totalPaise: doc.totalPaise },
  });

  return sanitize(await baseQuery(doc._id));
}

async function addItem(id, payload, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Invoice not found');
  if (doc.status === 'finalized') throw new ApiError(409, 'Finalized invoices are locked and cannot add items.');
  if (doc.status === 'cancelled') throw new ApiError(409, 'Cancelled invoices cannot add items.');

  if (payload.treatmentRecordId) {
    const existing = doc.items.find((i) => i.treatmentRecord && String(i.treatmentRecord) === String(payload.treatmentRecordId));
    if (existing) throw new ApiError(409, 'This completed treatment is already billed on the invoice.');
  }

  const item = await buildItem(payload, doc.patient, actor);
  doc.items.push(item);

  const totals = computeTotals(doc);
  doc.subtotalPaise = totals.subtotalPaise;
  doc.discountPaise = totals.discountPaise;
  doc.taxPaise = totals.taxPaise;
  doc.totalPaise = totals.totalPaise;
  doc.updatedBy = actor._id;
  await doc.save();
  await refreshPaidTotals(doc);
  if (doc.isModified()) await doc.save();

  await recordAudit({
    user: actor,
    action: 'update',
    entity: 'invoice',
    entityId: doc._id,
    description: `Line "${item.name}" added to invoice ${doc.invoiceNumber}`,
    meta: { itemName: item.name, unitPricePaise: item.unitPricePaise, qty: item.qty },
  });

  return sanitize(await baseQuery(doc._id));
}

async function removeItem(id, itemId, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Invoice not found');
  if (doc.status === 'finalized') throw new ApiError(409, 'Finalized invoices are locked and cannot remove items.');
  if (doc.status === 'cancelled') throw new ApiError(409, 'Cancelled invoices cannot be edited.');

  const idx = doc.items.findIndex((i) => String(i._id) === String(itemId));
  if (idx === -1) throw new ApiError(404, 'Invoice line not found');
  const [removed] = doc.items.splice(idx, 1);

  const totals = computeTotals(doc);
  doc.subtotalPaise = totals.subtotalPaise;
  doc.discountPaise = totals.discountPaise;
  doc.taxPaise = totals.taxPaise;
  doc.totalPaise = totals.totalPaise;
  doc.updatedBy = actor._id;
  await doc.save();
  await refreshPaidTotals(doc);
  if (doc.isModified()) await doc.save();

  await recordAudit({
    user: actor,
    action: 'update',
    entity: 'invoice',
    entityId: doc._id,
    description: `Line "${removed.name}" removed from invoice ${doc.invoiceNumber}`,
    meta: { itemName: removed.name },
  });

  return sanitize(await baseQuery(doc._id));
}

async function finalize(id, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Invoice not found');
  if (doc.status === 'finalized') return sanitize(doc);
  if (doc.status === 'cancelled') throw new ApiError(409, 'Cancelled invoices cannot be finalized.');

  const totals = computeTotals(doc);
  doc.subtotalPaise = totals.subtotalPaise;
  doc.discountPaise = totals.discountPaise;
  doc.taxPaise = totals.taxPaise;
  doc.totalPaise = totals.totalPaise;
  doc.status = 'finalized';
  doc.finalizedAt = new Date();
  doc.finalizedBy = actor._id;
  await doc.save();
  await refreshPaidTotals(doc);
  if (doc.isModified()) await doc.save();

  await recordAudit({
    user: actor,
    action: 'finalize',
    entity: 'invoice',
    entityId: doc._id,
    description: `Invoice ${doc.invoiceNumber} finalized for ₹${toRupees(doc.totalPaise)}`,
    meta: { totalPaise: doc.totalPaise },
  });

  return sanitize(await baseQuery(doc._id));
}

async function cancel(id, reason, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Invoice not found');
  if (doc.status === 'cancelled') return sanitize(doc);
  if (doc.amountPaidPaise > 0) throw new ApiError(409, 'Invoices with payments must be refunded before cancellation.');

  doc.status = 'cancelled';
  doc.cancelledAt = new Date();
  doc.cancelledBy = actor._id;
  doc.cancelReason = reason ? String(reason).trim() : '';
  await doc.save();

  await recordAudit({
    user: actor,
    action: 'cancel',
    entity: 'invoice',
    entityId: doc._id,
    description: `Invoice ${doc.invoiceNumber} cancelled`,
    meta: { reason: doc.cancelReason },
  });

  return sanitize(await baseQuery(doc._id));
}

async function getPrintView(id, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Invoice not found');
  await refreshPaidTotals(doc);
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    id: doc._id,
    invoiceNumber: doc.invoiceNumber,
    patient: d.patient,
    visit: d.visit,
    doctor: d.doctor,
    billDate: doc.billDate,
    status: doc.status,
    paymentStatus: doc.paymentStatus,
    items: sanitizeItems(d.items),
    discountType: doc.discountType,
    discountValue: doc.discountValue,
    subtotal: toRupees(doc.subtotalPaise),
    discount: toRupees(doc.discountPaise),
    tax: toRupees(doc.taxPaise),
    total: toRupees(doc.totalPaise),
    amountPaid: toRupees(doc.amountPaidPaise),
    balance: toRupees(doc.balancePaise),
    notes: doc.notes || '',
    finalizedAt: doc.finalizedAt,
    finalizedBy: doc.finalizedBy,
  };
}

async function removeInvoice(id, actor) {
  const doc = await Invoice.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new ApiError(404, 'Invoice not found');

  doc.isDeleted = true;
  doc.deletedAt = new Date();
  if (actor && actor._id) doc.deletedBy = actor._id;
  await doc.save();

  await recordAudit({
    user: actor,
    action: 'delete',
    entity: 'invoice',
    entityId: doc._id,
    description: `Invoice ${doc.invoiceNumber} soft deleted`,
  });

  return { success: true, message: 'Record deleted successfully.' };
}

async function restoreInvoice(id, actor) {
  const doc = await Invoice.findById(id);
  if (!doc) throw new ApiError(404, 'Invoice not found');

  doc.isDeleted = false;
  doc.deletedAt = null;
  doc.deletedBy = null;
  await doc.save();

  return sanitize(await baseQuery(id));
}

module.exports = {
  create,
  get,
  list,
  listByVisit,
  update,
  addItem,
  removeItem,
  removeInvoice,
  restoreInvoice,
  finalize,
  cancel,
  getPrintView,
};