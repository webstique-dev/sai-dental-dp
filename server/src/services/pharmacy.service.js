const Prescription = require('../models/Prescription');
const Medicine = require('../models/Medicine');
const MedicineBatch = require('../models/MedicineBatch');
const inventory = require('./inventory.service');
const dispensingService = require('./dispensing.service');
const ApiError = require('../utils/ApiError');

const DISPENSABLE_STATUSES = ['issued', 'partially-dispensed'];

// Sanitize an inventory medicine enough for dispense pickers.
function sanitizeMedicine(doc) {
  const d = doc && doc.toObject ? doc.toObject() : doc;
  return {
    id: d._id,
    name: d.name,
    genericName: d.genericName || '',
    category: d.category,
    quantity: d.quantity,
    available: d.quantity,
    sellPrice: d.sellPrice,
    dosageForm: d.dosageForm,
    strength: d.strength || '',
    unit: d.unit || 'tablet',
  };
}

function itemStatus(item) {
  const prescribed = item.quantity ?? null;
  const done = item.dispensedQuantity || 0;
  if (prescribed === null || prescribed <= 0) return done > 0 ? 'dispensed' : 'pending';
  if (done <= 0) return 'pending';
  if (done >= prescribed) return 'dispensed';
  return 'partially-dispensed';
}

function sanitizeItem(i) {
  const d = i && i.toObject ? i.toObject() : i;
  return {
    id: d._id,
    medicineId: d.medicineId || null,
    medicine: d.medicine,
    genericName: d.genericName || '',
    dosage: d.dosage || '',
    unit: d.unit || 'mg',
    frequency: d.frequency,
    customFrequency: d.customFrequency || '',
    duration: d.duration ?? null,
    durationUnit: d.durationUnit || 'day',
    route: d.route,
    quantity: d.quantity ?? null,
    foodInstruction: d.foodInstruction || 'after-food',
    instructions: d.instructions || '',
    notes: d.notes || '',
    dispensedQuantity: d.dispensedQuantity ?? 0,
    remaining: itemRemaining(d),
    status: itemStatus(d),
  };
}

function itemRemaining(d) {
  const prescribed = d.quantity ?? null;
  if (prescribed === null) return null;
  return Math.max(0, prescribed - (d.dispensedQuantity || 0));
}

function sanitize(doc) {
  const d = doc && doc.toObject ? doc.toObject() : doc;
  return {
    id: d._id,
    prescriptionNumber: d.prescriptionNumber,
    patient: d.patient,
    visit: d.visit,
    consultation: d.consultation,
    doctor: d.doctor,
    diagnosis: d.diagnosis,
    rxDate: d.rxDate,
    status: d.status,
    issuedAt: d.issuedAt,
    issuedBy: d.issuedBy,
    cancelledAt: d.cancelledAt,
    cancelReason: d.cancelReason || '',
    notes: d.notes || '',
    items: (d.items || []).map(sanitizeItem),
    medicineCount: (d.items || []).length,
    dispensedAt: d.dispensedAt || null,
    dispensedBy: d.dispensedBy || null,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

const baseQuery = (id) =>
  Prescription.findOne({ _id: id, isArchived: false })
    .populate('patient', 'firstName lastName patientId gender phone dob')
    .populate('doctor', 'name')
    .populate('issuedBy', 'name')
    .populate('dispensedBy', 'name')
    .populate('visit', 'opNumber')
    .populate('consultation', 'status')
    .populate('diagnosis', 'name category toothNumber');

async function getDispenseView(id, actor) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Prescription not found');
  const out = sanitize(doc);

  // Attach FEFO batch availability per dispensed line so the pharmacy screen
  // can pre-fill batch allocations.
  const medicineIds = [...new Set((doc.items || []).map((it) => it.medicineId && String(it.medicineId)).filter(Boolean))];
  const batchesByMed = new Map();
  if (medicineIds.length) {
    const batches = await MedicineBatch.find({ medicine: { $in: medicineIds }, isActive: true })
      .sort({ expiryDate: 1, createdAt: 1 });
    for (const b of batches) {
      if (inventory.isExpiredDate(b.expiryDate) || (b.currentQuantity || 0) <= 0) continue;
      const key = String(b.medicine);
      if (!batchesByMed.has(key)) batchesByMed.set(key, []);
      batchesByMed.get(key).push({
        id: b._id,
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate,
        currentQuantity: b.currentQuantity,
        sellPrice: b.sellPrice,
      });
    }
  }
  out.availability = {};
  for (const it of out.items) {
    if (!it.medicineId) {
      out.availability[it.id] = [];
      continue;
    }
    const batches = batchesByMed.get(String(it.medicineId)) || [];
    const available = batches.reduce((s, b) => s + b.currentQuantity, 0);
    out.availability[it.id] = {
      medicineId: it.medicineId,
      available,
      suggested: fefoAllocation(batches, it.remaining ?? 0),
      batches,
    };
  }
  return out;
}

function fefoAllocation(batches, requested) {
  const allocs = [];
  let remaining = requested;
  for (const b of batches) {
    const use = Math.min(remaining, b.currentQuantity);
    if (use > 0) {
      allocs.push({ batchId: b.id, batchNumber: b.batchNumber, quantity: use });
      remaining -= use;
    }
    if (remaining <= 0) break;
  }
  return allocs;
}

async function listPending(actor) {
  const docs = await Prescription.find({ status: { $in: DISPENSABLE_STATUSES }, isArchived: false })
    .sort({ issuedAt: -1 })
    .populate('patient', 'firstName lastName patientId gender phone dob')
    .populate('doctor', 'name')
    .populate('issuedBy', 'name')
    .populate('visit', 'opNumber')
    .populate('consultation', 'status');
  return docs.map(sanitize);
}

// Dispense against a prescription (legacy pharmacy endpoint). Supports both
// explicit allocations and the old { itemId, medicineId, quantity } shape.
async function dispense(prescriptionId, payload, actor) {
  const result = await dispensingService.create(prescriptionId, payload, actor);
  const doc = await baseQuery(prescriptionId);
  return sanitize(doc);
}

// Pharmacy dashboard summary.
async function summary(actor) {
  const pending = await Prescription.find({ status: { $in: DISPENSABLE_STATUSES }, isArchived: false }).countDocuments();
  const inv = await inventory.summary();
  return {
    ...inv,
    pending,
    pendingPrescriptions: pending,
  };
}

async function getPendingCount() {
  return Prescription.find({ status: { $in: DISPENSABLE_STATUSES }, isArchived: false }).countDocuments();
}

module.exports = { dispense, getDispenseView, listPending, summary, sanitizeMedicine, getPendingCount, DISPENSABLE_STATUSES };