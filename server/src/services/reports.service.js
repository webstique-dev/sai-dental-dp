const { Visit } = require('../models/Visit');
const Payment = require('../models/Payment');
const { Appointment } = require('../models/Appointment');
const Dispensing = require('../models/Dispensing');
const Medicine = require('../models/Medicine');
const MedicineBatch = require('../models/MedicineBatch');

async function getReceptionistSummary({ date } = {}) {
  const targetDate = date ? new Date(date) : new Date();
  const start = new Date(targetDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  // 1. Daily Footfall from Visits
  const visits = await Visit.find({
    opDate: { $gte: start, $lt: end },
    isArchived: false,
  });

  const totalFootfall = visits.length;
  let walkInCount = 0;
  let appointmentCheckInCount = 0;
  const visitStatusCounts = {
    registered: 0,
    'in-progress': 0,
    completed: 0,
    cancelled: 0,
  };

  visits.forEach((v) => {
    if (v.source === 'walk-in') {
      walkInCount += 1;
    } else {
      appointmentCheckInCount += 1;
    }
    if (visitStatusCounts[v.status] !== undefined) {
      visitStatusCounts[v.status] += 1;
    }
  });

  // 2. Daily Revenue from Payments
  const payments = await Payment.find({
    paymentDate: { $gte: start, $lt: end },
    isArchived: false,
  });

  let totalRevenuePaise = 0;
  const byMethodPaise = {
    cash: 0,
    upi: 0,
    card: 0,
    'bank-transfer': 0,
    other: 0,
  };

  payments.forEach((p) => {
    const amount = p.type === 'refund' ? -p.amountPaise : p.amountPaise;
    totalRevenuePaise += amount;
    const m = p.method || 'cash';
    if (byMethodPaise[m] !== undefined) {
      byMethodPaise[m] += amount;
    } else {
      byMethodPaise.other += amount;
    }
  });

  // Convert paise to rupees for convenience
  const revenueSummary = {
    totalPaise: totalRevenuePaise,
    totalRupees: totalRevenuePaise / 100,
    byMethod: {
      cash: (byMethodPaise.cash || 0) / 100,
      upi: (byMethodPaise.upi || 0) / 100,
      card: (byMethodPaise.card || 0) / 100,
      bankTransfer: (byMethodPaise['bank-transfer'] || 0) / 100,
      other: (byMethodPaise.other || 0) / 100,
    },
    paymentCount: payments.length,
  };

  // 3. Appointment Status Summary
  const appointments = await Appointment.find({
    date: { $gte: start, $lt: end },
  });

  const appointmentStatuses = {
    total: appointments.length,
    scheduled: 0,
    confirmed: 0,
    'checked-in': 0,
    'in-consultation': 0,
    completed: 0,
    cancelled: 0,
    'no-show': 0,
  };

  const appointmentSources = {
    'walk-in': 0,
    phone: 0,
    website: 0,
    existing: 0,
    other: 0,
  };

  appointments.forEach((apt) => {
    if (appointmentStatuses[apt.status] !== undefined) {
      appointmentStatuses[apt.status] += 1;
    }
    const src = apt.source || 'walk-in';
    if (appointmentSources[src] !== undefined) {
      appointmentSources[src] += 1;
    } else {
      appointmentSources.other += 1;
    }
  });

  return {
    date: start.toISOString().split('T')[0],
    footfall: {
      total: totalFootfall,
      walkIn: walkInCount,
      appointmentCheckIn: appointmentCheckInCount,
      byStatus: visitStatusCounts,
    },
    revenue: revenueSummary,
    appointments: {
      byStatus: appointmentStatuses,
      bySource: appointmentSources,
    },
  };
}

async function getPharmacySummary({ date } = {}) {
  const targetDate = date ? new Date(date) : new Date();
  const start = new Date(targetDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  // 1. Daily Dispensing Report
  const dispensings = await Dispensing.find({
    dispensedAt: { $gte: start, $lt: end },
    status: 'completed',
  })
    .populate('patient', 'firstName lastName patientId phone')
    .populate('pharmacist', 'name role')
    .populate('prescription', 'prescriptionNumber');

  let totalDispensedEvents = dispensings.length;
  let totalUnitsDispensed = 0;
  dispensings.forEach((d) => {
    totalUnitsDispensed += d.totalQuantity || 0;
  });

  // 2. Stock-on-Hand Valuation
  const medicines = await Medicine.find({ isActive: true });
  const batches = await MedicineBatch.find({ isActive: true });

  let totalMedicines = medicines.length;
  let totalBatches = batches.length;
  let totalStockQuantity = 0;
  let totalCostValue = 0;
  let totalRetailValue = 0;
  const lowStockMedicines = [];

  medicines.forEach((m) => {
    const qty = m.quantity || 0;
    totalStockQuantity += qty;
    totalCostValue += qty * (m.costPrice || 0);
    totalRetailValue += qty * (m.sellPrice || 0);

    if (qty <= (m.reorderLevel || 10)) {
      lowStockMedicines.push({
        id: m._id,
        name: m.name,
        genericName: m.genericName,
        category: m.category,
        quantity: qty,
        reorderLevel: m.reorderLevel,
        unit: m.unit,
      });
    }
  });

  // 3. Batch Expiry Alerts (expired or expiring in next 60 days)
  const sixtyDaysFromNow = new Date();
  sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

  const expiringBatches = await MedicineBatch.find({
    isActive: true,
    currentQuantity: { $gt: 0 },
    expiryDate: { $ne: null, $lte: sixtyDaysFromNow },
  }).populate('medicine', 'name genericName');

  return {
    date: start.toISOString().split('T')[0],
    dispensing: {
      totalEvents: totalDispensedEvents,
      totalUnits: totalUnitsDispensed,
      records: dispensings.map((d) => ({
        id: d._id,
        dispensingNumber: d.dispensingNumber,
        prescriptionNumber: d.prescription?.prescriptionNumber || '—',
        patientName: d.patient ? `${d.patient.firstName} ${d.patient.lastName}` : '—',
        patientId: d.patient?.patientId || '—',
        pharmacistName: d.pharmacist?.name || 'Pharmacist',
        dispensedAt: d.dispensedAt,
        totalQuantity: d.totalQuantity,
        items: (d.items || []).map((it) => ({
          medicineName: it.medicineName,
          quantity: it.quantity,
          dosage: it.dosage,
          unit: it.unit,
        })),
      })),
    },
    inventorySummary: {
      totalMedicines,
      totalBatches,
      totalStockQuantity,
      totalCostValue,
      totalRetailValue,
    },
    lowStock: {
      count: lowStockMedicines.length,
      items: lowStockMedicines,
    },
    expiringBatches: {
      count: expiringBatches.length,
      items: expiringBatches.map((b) => ({
        id: b._id,
        medicineName: b.medicine?.name || 'Medicine',
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate,
        currentQuantity: b.currentQuantity,
        isExpired: b.expiryDate < new Date(),
      })),
    },
  };
}

const Patient = require('../models/Patient');
const { Consultation } = require('../models/Consultation');
const TreatmentRecord = require('../models/TreatmentRecord');
const { User } = require('../models/User');

async function getExecutiveAnalytics({ startDate, endDate, doctorId } = {}) {
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 86400000);
  start.setHours(0, 0, 0, 0);
  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);

  const dateFilter = { $gte: start, $lte: end };

  // 1. Patient Registrations
  const patientCount = await Patient.countDocuments({ createdAt: dateFilter });

  // 2. Consultations Filter
  const consultQuery = { visitDate: dateFilter, isArchived: false };
  if (doctorId) consultQuery.doctor = doctorId;
  const consultations = await Consultation.find(consultQuery).populate('doctor', 'name role');

  const consultStats = {
    total: consultations.length,
    completed: consultations.filter((c) => c.status === 'completed').length,
    inProgress: consultations.filter((c) => c.status === 'in-progress' || c.status === 'draft').length,
  };

  // 3. Revenue from Payments
  const paymentQuery = { paymentDate: dateFilter, isArchived: false };
  const payments = await Payment.find(paymentQuery);
  let totalRevenuePaise = 0;
  const revenueByMethod = { cash: 0, upi: 0, card: 0, bankTransfer: 0, other: 0 };

  payments.forEach((p) => {
    const amt = p.type === 'refund' ? -p.amountPaise : p.amountPaise;
    totalRevenuePaise += amt;
    const m = p.method || 'cash';
    if (m === 'cash') revenueByMethod.cash += amt;
    else if (m === 'upi') revenueByMethod.upi += amt;
    else if (m === 'card') revenueByMethod.card += amt;
    else if (m === 'bank-transfer') revenueByMethod.bankTransfer += amt;
    else revenueByMethod.other += amt;
  });

  // 4. Executed Clinical Procedures Breakdown
  const trQuery = { procedureDate: dateFilter, isArchived: false };
  if (doctorId) trQuery.doctor = doctorId;
  const treatmentRecords = await TreatmentRecord.find(trQuery);
  const procedureCounts = {};
  treatmentRecords.forEach((tr) => {
    const p = tr.procedure || 'Other Procedure';
    procedureCounts[p] = (procedureCounts[p] || 0) + 1;
  });

  const topProcedures = Object.entries(procedureCounts)
    .map(([procedure, count]) => ({ procedure, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 5. Doctor Performance Summary
  const doctorMap = new Map();
  consultations.forEach((c) => {
    const docId = String(c.doctor?._id || c.doctor?.id || 'unknown');
    const docName = c.doctor?.name || 'Doctor';
    if (!doctorMap.has(docId)) {
      doctorMap.set(docId, { id: docId, name: docName, consultations: 0, completed: 0 });
    }
    const stat = doctorMap.get(docId);
    stat.consultations += 1;
    if (c.status === 'completed') stat.completed += 1;
  });

  // 6. Pharmacy Dispensing Summary in Date Range
  const dispensings = await Dispensing.find({ dispensedAt: dateFilter, status: 'completed' });
  let totalUnitsDispensed = 0;
  dispensings.forEach((d) => {
    totalUnitsDispensed += d.totalQuantity || 0;
  });

  return {
    period: {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    },
    patientRegistrations: patientCount,
    revenue: {
      totalRupees: totalRevenuePaise / 100,
      totalPaise: totalRevenuePaise,
      byMethodRupees: {
        cash: revenueByMethod.cash / 100,
        upi: revenueByMethod.upi / 100,
        card: revenueByMethod.card / 100,
        bankTransfer: revenueByMethod.bankTransfer / 100,
        other: revenueByMethod.other / 100,
      },
      paymentCount: payments.length,
    },
    consultations: consultStats,
    doctorPerformance: Array.from(doctorMap.values()),
    topProcedures,
    pharmacy: {
      dispenseEvents: dispensings.length,
      totalUnitsDispensed,
    },
  };
}

module.exports = { getReceptionistSummary, getPharmacySummary, getExecutiveAnalytics };
