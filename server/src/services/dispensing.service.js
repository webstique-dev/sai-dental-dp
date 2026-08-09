const mongoose = require('mongoose');
const Prescription = require('../models/Prescription');
const Medicine = require('../models/Medicine');
const MedicineBatch = require('../models/MedicineBatch');
const InventoryTransaction = require('../models/InventoryTransaction');
const Dispensing = require('../models/Dispensing');
const dispensingService = require('./inventory.service');
const { recordAudit } = require('../utils/audit');
const { nextDispensingNumber } = require('../models/Counter');
const ApiError = require('../utils/ApiError');

const DISPENSABLE_STATUSES = ['issued', 'partially-dispensed'];

function sanitizeItem(d) {
  return {
    id: d._id,
    prescriptionItem: d.prescriptionItem,
    medicine: d.medicine,
    batch: d.batch,
    medicineName: d.medicineName || '',
    dosage: d.dosage || '',
    unit: d.unit || 'tablet',
    quantity: d.quantity,
    remainingAfter: d.remainingAfter ?? null,
    sellPrice: d.sellPrice || 0,
    notes: d.notes || '',
  };
}

function sanitize(doc) {
  const d = doc && doc.toObject ? doc.toObject() : doc;
  return {
    id: d._id,
    dispensingNumber: d.dispensingNumber,
    prescription: d.prescription,
    patient: d.patient,
    visit: d.visit,
    pharmacist: d.pharmacist,
    dispensedAt: d.dispensedAt,
    items: (d.items || []).map(sanitizeItem),
    totalQuantity: d.totalQuantity || 0,
    invoice: d.invoice || null,
    status: d.status,
    notes: d.notes || '',
    cancelledAt: d.cancelledAt || null,
    cancelReason: d.cancelReason || '',
    createdAt: d.createdAt,
  };
}

const baseQuery = (id) =>
  Dispensing.findById(id)
    .populate('prescription', 'prescriptionNumber status')
    .populate('patient', 'firstName lastName patientId phone dob')
    .populate('visit', 'opNumber')
    .populate('pharmacist', 'name')
    .populate('items.medicine', 'name genericName')
    .populate('items.batch', 'batchNumber expiryDate');

// Build a validated dispense plan for a prescription. Supports both explicit
// batch allocations and automatic FEFO allocation.
//   items: [{ itemId, medicineId, quantity, allocations: [{ batchId, quantity }] }]
async function buildPlan(prescription, payload, actor) {
  const lines = Array.isArray(payload && payload.items) ? payload.items : [];
  if (lines.length === 0) throw new ApiError(400, 'Dispense at least one line.');

  const itemsById = new Map((prescription.items || []).map((it) => [String(it._id), it]));
  const plan = [];

  for (const line of lines) {
    const item = itemsById.get(String(line.itemId));
    if (!item) throw new ApiError(400, 'A dispense line does not match any prescription item.');

    let medicineId = line.medicineId || item.medicineId || null;
    if (!medicineId) throw new ApiError(400, `No inventory medicine selected for "${item.medicine}".`);

    // Ensure the chosen medicine matches the prescribed medicine when the
    // prescription line is already linked to a master record.
    if (item.medicineId && String(item.medicineId) !== String(medicineId)) {
      throw new ApiError(400, `Dispensed medicine does not match the prescribed medicine for "${item.medicine}".`);
    }

    const medicine = await Medicine.findById(medicineId);
    if (!medicine || !medicine.isActive) throw new ApiError(400, 'Selected medicine is inactive or missing.');

    const prescribed = item.quantity ?? null;
    const already = item.dispensedQuantity || 0;
    const requested = Math.floor(Number(line.quantity) || 0);
    if (!Number.isFinite(requested) || requested <= 0) {
      throw new ApiError(400, `Dispense quantity for "${item.medicine}" must be a positive number.`);
    }
    if (prescribed !== null && already + requested > prescribed) {
      throw new ApiError(400, `Cannot dispense more than prescribed for "${item.medicine}" (${prescribed} prescribed, ${already} already dispensed).`);
    }

    let batches = await MedicineBatch.find({ medicine: medicineId, isActive: true })
      .sort({ expiryDate: 1, createdAt: 1 });

    // Adopt legacy medicine-level stock into an auto batch on first use, so the
    // batch ledger stays the single source of truth without losing stock.
    if (batches.length === 0 && (medicine.quantity || 0) > 0) {
      await dispensingService.ensureBatch(medicineId, {
        expiryDate: medicine.expiryDate,
        quantity: medicine.quantity,
        purchasePrice: medicine.costPrice,
        sellPrice: medicine.sellPrice,
        supplier: medicine.supplier,
      }, actor);
      batches = await MedicineBatch.find({ medicine: medicineId, isActive: true })
        .sort({ expiryDate: 1, createdAt: 1 });
    }

    const usable = batches.filter((b) => !dispensingService.isExpiredDate(b.expiryDate) && (b.currentQuantity || 0) > 0);
    if (usable.length === 0) {
      const hasAny = batches.length > 0;
      throw new ApiError(409, hasAny
        ? `Medicine unavailable because all available batches of "${medicine.name}" are expired.`
        : `No stock available for "${medicine.name}".`);
    }

    // Validate/aggregate allocations.
    const allocs = [];
    if (Array.isArray(line.allocations) && line.allocations.length > 0) {
      let total = 0;
      for (const a of line.allocations) {
        const q = Math.floor(Number(a.quantity) || 0);
        if (!Number.isFinite(q) || q <= 0) throw new ApiError(400, `Batch quantity must be a positive number.`);
        const batch = batches.find((b) => String(b._id) === String(a.batchId));
        if (!batch) throw new ApiError(400, 'Dispense allocation references an unknown batch.');
        if (dispensingService.isExpiredDate(batch.expiryDate)) {
          throw new ApiError(409, `Cannot dispense from expired batch "${batch.batchNumber}".`);
        }
        if ((batch.currentQuantity || 0) < q) {
          throw new ApiError(409, `Insufficient stock in batch "${batch.batchNumber}". Available: ${batch.currentQuantity}.`);
        }
        allocs.push({ batch, qty: q });
        total += q;
      }
      if (total !== requested) {
        throw new ApiError(400, `Allocated quantity (${total}) does not match requested quantity (${requested}) for "${item.medicine}".`);
      }
    } else {
      // FEFO auto-allocation.
      let remaining = requested;
      for (const batch of usable) {
        const use = Math.min(remaining, batch.currentQuantity || 0);
        if (use > 0) {
          allocs.push({ batch, qty: use });
          remaining -= use;
        }
        if (remaining <= 0) break;
      }
      if (remaining > 0) {
        const available = usable.reduce((s, b) => s + (b.currentQuantity || 0), 0);
        throw new ApiError(409, `Insufficient stock for "${medicine.name}". Available: ${available}. Requested: ${requested}.`);
      }
    }

    allocs.sort((a, b) => new Date(a.batch.expiryDate || 0) - new Date(b.batch.expiryDate || 0));
    plan.push({
      item,
      medicine,
      requested,
      allocations: allocs.map(({ batch, qty }) => ({ batch, qty })),
      sellPrice: medicine.sellPrice || 0,
    });
  }

  return plan;
}

async function runDispensing(prescriptionId, payload, actor) {
  const prescription = await Prescription.findOne({ _id: prescriptionId, isArchived: false });
  if (!prescription) throw new ApiError(404, 'Prescription not found');
  if (!DISPENSABLE_STATUSES.includes(prescription.status)) {
    throw new ApiError(409, `Prescription cannot be dispensed in "${prescription.status}" state.`);
  }

  const plan = await buildPlan(prescription, payload, actor);

  const applied = []; // batches already decremented (for rollback)
  try {
    // Step 7 - atomic, guarded stock deduction (never negative, FEFO-safe).
    for (const line of plan) {
      for (const { batch, qty } of line.allocations) {
        const updated = await MedicineBatch.findOneAndUpdate(
          { _id: batch._id, isActive: true, currentQuantity: { $gte: qty } },
          { $inc: { currentQuantity: -qty } },
          { new: true },
        );
        if (!updated) {
          throw new ApiError(409, `Insufficient or locked stock in batch "${batch.batchNumber}". Available: ${batch.currentQuantity}.`);
        }
        applied.push({ batchId: batch._id, qty, updated });
      }
    }
  } catch (err) {
    for (const { batchId, qty } of applied) {
      await MedicineBatch.updateOne({ _id: batchId }, { $inc: { currentQuantity: qty } });
    }
    throw err;
  }

  try {
    // Step 8 - stock movements.
    for (const { batchId, qty, updated } of applied) {
      const mv = await InventoryTransaction.create({
        medicine: updated.medicine,
        batch: batchId,
        action: 'dispense',
        quantityChange: -qty,
        previousQuantity: updated.currentQuantity + qty,
        newQuantity: updated.currentQuantity,
        balanceAfter: updated.currentQuantity,
        refType: null, // filled after dispensing record is created below
        refId: null,
        notes: `Dispensing for ${prescription.prescriptionNumber}`,
        performedBy: actor._id,
      });
      await recordAudit({
        user: actor,
        action: 'dispense',
        entity: 'inventory-transaction',
        entityId: mv._id,
        description: `Dispensed ${qty} from batch "${mv.batch}" for ${prescription.prescriptionNumber}`,
        meta: { medicine: updated.medicine, batch: batchId, quantity: qty },
      });
    }

    // Step 9 - update prescription item quantities.
    const dispItems = [];
    let totalQuantity = 0;
    for (const line of plan) {
      line.item.dispensedQuantity = (line.item.dispensedQuantity || 0) + line.requested;
      let remainingAfter = null;
      if (line.item.quantity !== null && line.item.quantity !== undefined) {
        remainingAfter = Math.max(0, (line.item.quantity || 0) - line.item.dispensedQuantity);
      }
      for (const { batch, qty } of line.allocations) {
        dispItems.push({
          prescriptionItem: line.item._id,
          medicine: batch.medicine,
          batch: batch._id,
          medicineName: line.item.medicine,
          dosage: line.item.dosage || '',
          unit: line.item.unit || 'tablet',
          quantity: qty,
          remainingAfter,
          sellPrice: line.sellPrice || 0,
          notes: line.item.instructions || '',
        });
        totalQuantity += qty;
      }
    }

    // Recompute prescription status from its items.
    const allFully = (prescription.items || []).every((it) => {
      if (it.quantity === null || it.quantity === undefined || it.quantity <= 0) {
        return (it.dispensedQuantity || 0) > 0;
      }
      return (it.dispensedQuantity || 0) >= it.quantity;
    });
    prescription.status = allFully ? 'dispensed' : 'partially-dispensed';
    prescription.dispensedAt = new Date();
    prescription.dispensedBy = actor._id;
    await prescription.save();

    // Step 10 - create the dispensing record (multiple events preserved).
    const dispensingDoc = await Dispensing.create({
      dispensingNumber: await nextDispensingNumber(),
      prescription: prescription._id,
      patient: prescription.patient,
      visit: prescription.visit,
      pharmacist: actor._id,
      dispensedAt: new Date(),
      items: dispItems,
      totalQuantity,
      status: 'completed',
      notes: payload && payload.notes ? String(payload.notes).trim() : '',
    });

    // Link the movements to the dispensing record (keeps full audit trail).
    await InventoryTransaction.updateMany(
      { refType: null, refId: null, notes: `Dispensing for ${prescription.prescriptionNumber}` },
      { $set: { refType: 'dispensing', refId: dispensingDoc._id } },
    );

    // Recompute master medicine caches.
    const medicineIds = new Set(plan.map((l) => String(l.medicine._id)));
    for (const id of medicineIds) await dispensingService.reconcileMedicineStock(id);

    await recordAudit({
      user: actor,
      action: 'dispense',
      entity: 'dispensing',
      entityId: dispensingDoc._id,
      description: `Dispensed ${prescription.prescriptionNumber}: ${plan.length} line(s), ${totalQuantity} units → ${prescription.status}`,
      meta: { patient: prescription.patient, prescription: prescription._id, units: totalQuantity },
    });
    await recordAudit({
      user: actor,
      action: 'dispense',
      entity: 'prescription',
      entityId: prescription._id,
      description: `Prescription ${prescription.prescriptionNumber} dispensed (${totalQuantity} units) → ${prescription.status}`,
      meta: { patient: prescription.patient, dispensing: dispensingDoc._id, units: totalQuantity },
    });

    return {
      dispensing: sanitize(dispensingDoc),
      prescriptionStatus: prescription.status,
    };
  } catch (err) {
    // Compensate: restore stock and remove movements created in this attempt.
    for (const { batchId, qty } of applied) {
      await MedicineBatch.updateOne({ _id: batchId }, { $inc: { currentQuantity: qty } });
    }
    await InventoryTransaction.deleteMany({
      notes: `Dispensing for ${prescription.prescriptionNumber}`,
      refType: null,
    });
    throw err;
  }
}

async function create(prescriptionId, payload, actor) {
  return runDispensing(prescriptionId, payload, actor);
}

async function getDispensing(id) {
  const doc = await baseQuery(id);
  if (!doc) throw new ApiError(404, 'Dispensing record not found');
  return sanitize(doc);
}

async function listByPrescription(prescriptionId, actor) {
  const docs = await Dispensing.find({ prescription: prescriptionId })
    .sort({ createdAt: -1 })
    .populate('patient', 'firstName lastName patientId')
    .populate('pharmacist', 'name')
    .populate('items.medicine', 'name genericName');
  return docs.map(sanitize);
}

async function listByPatient(patientId, actor) {
  const docs = await Dispensing.find({ patient: patientId })
    .sort({ createdAt: -1 })
    .populate('prescription', 'prescriptionNumber status')
    .populate('pharmacist', 'name')
    .populate('items.medicine', 'name genericName');
  return docs.map(sanitize);
}

async function complete(id, actor) {
  const doc = await Dispensing.findById(id);
  if (!doc) throw new ApiError(404, 'Dispensing record not found');
  if (doc.status === 'cancelled') throw new ApiError(409, 'A cancelled dispensing cannot be completed.');
  if (doc.status === 'completed') return sanitize(doc); // idempotent
  doc.status = 'completed';
  await doc.save();
  await recordAudit({
    user: actor,
    action: 'complete',
    entity: 'dispensing',
    entityId: doc._id,
    description: `Dispensing ${doc.dispensingNumber} completed`,
    meta: { prescription: doc.prescription },
  });
  return sanitize(await baseQuery(id));
}

async function cancel(id, payload, actor) {
  const doc = await Dispensing.findById(id);
  if (!doc) throw new ApiError(404, 'Dispensing record not found');
  if (doc.status === 'cancelled') throw new ApiError(409, 'Already cancelled');
  if (doc.status === 'completed') {
    throw new ApiError(409, 'Completed dispensing cannot be cancelled. Use a stock adjustment to correct inventory.');
  }
  doc.status = 'cancelled';
  doc.cancelledAt = new Date();
  doc.cancelledBy = actor._id;
  doc.cancelReason = payload && payload.reason ? String(payload.reason).trim() : '';
  await doc.save();
  await recordAudit({
    user: actor,
    action: 'cancel',
    entity: 'dispensing',
    entityId: doc._id,
    description: `Dispensing ${doc.dispensingNumber} cancelled`,
    meta: { prescription: doc.prescription },
  });
  return sanitize(doc);
}

module.exports = {
  create,
  get: getDispensing,
  listByPrescription,
  listByPatient,
  complete,
  cancel,
  sanitize,
  DISPENSABLE_STATUSES,
};