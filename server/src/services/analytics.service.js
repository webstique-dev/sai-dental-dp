const Payment = require('../models/Payment');
const Medicine = require('../models/Medicine');
const MedicineBatch = require('../models/MedicineBatch');
const InventoryTransaction = require('../models/InventoryTransaction');
const Dispensing = require('../models/Dispensing');
const Patient = require('../models/Patient');
const { Appointment } = require('../models/Appointment');
const { Visit } = require('../models/Visit');
const { Consultation } = require('../models/Consultation');
const TreatmentRecord = require('../models/TreatmentRecord');
const { toRupees } = require('../utils/money');

// ---------------------------------------------------------------------------
// Date / bucket helpers
// ---------------------------------------------------------------------------

const pad = (n) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function startOfRange({ startDate, endDate, days = 30 } = {}) {
  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);
  let start;
  if (startDate) {
    start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
  } else {
    start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);
  }
  return { start, end };
}

function isoWeekKey(d) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day + 3);
  const firstThursday = new Date(x.getFullYear(), 0, 4);
  const firstDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDay + 3);
  const week = 1 + Math.round(((x - firstThursday) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
  return `${x.getFullYear()}-W${pad(week)}`;
}

function bucketKey(date, groupBy) {
  const d = new Date(date);
  if (groupBy === 'month') return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  if (groupBy === 'week') return isoWeekKey(d);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function bucketLabel(key, groupBy) {
  if (groupBy === 'month') {
    const [y, m] = key.split('-');
    return `${MONTHS[Number(m) - 1]} ${y}`;
  }
  if (groupBy === 'week') {
    const [y, w] = key.split('-W');
    return `W${w} ${y}`;
  }
  const [y, m, d] = key.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

function buildBuckets(start, end, groupBy) {
  const buckets = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const endMs = new Date(end).getTime();
  let guard = 0;
  while (cursor.getTime() <= endMs && guard < 600) {
    const key = bucketKey(cursor, groupBy);
    buckets.push({ key, label: bucketLabel(key, groupBy) });
    if (groupBy === 'month') cursor.setMonth(cursor.getMonth() + 1);
    else if (groupBy === 'week') cursor.setDate(cursor.getDate() + 7);
    else cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return buckets;
}

function inferGroupBy(start, end) {
  const days = Math.round((new Date(end) - new Date(start)) / 86400000) + 1;
  if (days <= 45) return 'day';
  if (days <= 200) return 'week';
  return 'month';
}

function rowSeries(buckets, map, defaults) {
  return buckets.map((b) => ({
    key: b.key,
    label: b.label,
    ...defaults,
    ...(map.get(b.key) || {}),
  }));
}

function netPaise(p) {
  return p.type === 'refund' ? -p.amountPaise : p.amountPaise;
}

const PERIOD_DAYS = { '7d': 7, '30d': 30, '3m': 90, '6m': 180, '1y': 365 };

// ---------------------------------------------------------------------------
// Low-level collectors (shared by every report)
// ---------------------------------------------------------------------------

async function collectPayments(start, end) {
  return Payment.find({
    paymentDate: { $gte: start, $lte: end },
    isArchived: false,
    isDeleted: { $ne: true },
  })
    .populate('patient', 'firstName lastName patientId')
    .populate('invoice', 'invoiceNumber')
    .lean();
}

async function collectDispensing(start, end) {
  return Dispensing.find({
    dispensedAt: { $gte: start, $lte: end },
    status: 'completed',
    isDeleted: { $ne: true },
  })
    .populate('patient', 'firstName lastName patientId')
    .populate('items.medicine', 'costPrice category name')
    .lean();
}

async function collectPurchases(start, end) {
  return InventoryTransaction.find({
    action: { $in: ['purchase', 'purchase-in'] },
    createdAt: { $gte: start, $lte: end },
    isDeleted: { $ne: true },
  })
    .populate('batch', 'purchasePrice supplier batchNumber')
    .populate('medicine', 'costPrice category name')
    .lean();
}

async function collectInventory() {
  const meds = await Medicine.find({ isActive: true, isDeleted: { $ne: true } }).lean();
  const byCategory = new Map();
  const lowStock = [];
  let totalStock = 0;
  let costPaise = 0;
  let sellPaise = 0;
  meds.forEach((m) => {
    const cat = m.category || 'other';
    if (!byCategory.has(cat)) byCategory.set(cat, { category: cat, count: 0, quantity: 0, costValue: 0, sellValue: 0 });
    const row = byCategory.get(cat);
    const qty = m.quantity || 0;
    row.count += 1;
    row.quantity += qty;
    row.costValue += qty * (m.costPrice || 0);
    row.sellValue += qty * (m.sellPrice || 0);
    totalStock += qty;
    costPaise += qty * (m.costPrice || 0) * 100;
    sellPaise += qty * (m.sellPrice || 0) * 100;
    if (qty <= (m.reorderLevel || 0)) {
      lowStock.push({
        id: m._id,
        name: m.name,
        genericName: m.genericName || '',
        category: m.category || 'other',
        unit: m.unit || 'tablet',
        quantity: qty,
        reorderLevel: m.reorderLevel || 0,
        sellPrice: m.sellPrice || 0,
        costPrice: m.costPrice || 0,
      });
    }
  });
  lowStock.sort((a, b) => a.quantity - b.quantity);
  return { meds, byCategory, lowStock, totalStock, costPaise, sellPaise };
}

function categoryLabel(cat) {
  const labels = {
    antibiotic: 'Antibiotic',
    analgesic: 'Analgesic',
    'anti-inflammatory': 'Anti-inflammatory',
    mouthwash: 'Mouthwash',
    anesthetic: 'Anesthetic',
    steroidal: 'Steroidal',
    supplement: 'Supplement',
    other: 'Other',
  };
  return labels[cat] || cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, ' ');
}

// ---------------------------------------------------------------------------
// Dashboard analytics (single payload for the Dashboard page)
// ---------------------------------------------------------------------------

async function getDashboardAnalytics({ period = '30d' } = {}) {
  const days = PERIOD_DAYS[period] || 30;
  const { start, end } = startOfRange({ days });
  const groupBy = inferGroupBy(start, end);
  const buckets = buildBuckets(start, end, groupBy);

  const [payments, dispensings, purchases, inventory, patientsTotal, newPatients, consultations, footfall, appointments, trDocs] =
    await Promise.all([
      collectPayments(start, end),
      collectDispensing(start, end),
      collectPurchases(start, end),
      collectInventory(),
      Patient.countDocuments({ isArchived: false, isDeleted: { $ne: true } }),
      Patient.countDocuments({ createdAt: { $gte: start, $lte: end }, isArchived: false, isDeleted: { $ne: true } }),
      Consultation.countDocuments({ visitDate: { $gte: start, $lte: end }, isArchived: false, isDeleted: { $ne: true } }),
      Visit.countDocuments({ opDate: { $gte: start, $lte: end }, isArchived: false, isDeleted: { $ne: true } }),
      Appointment.countDocuments({ date: { $gte: start, $lte: end }, isDeleted: { $ne: true } }),
      TreatmentRecord.find({ procedureDate: { $gte: start, $lte: end }, isArchived: false, isDeleted: { $ne: true } }).lean(),
    ]);

  // Revenue / orders per bucket
  const revenueByBucket = new Map(buckets.map((b) => [b.key, { revenue: 0, orders: 0 }]));
  let totalRevenuePaise = 0;
  let totalOrders = 0;
  payments.forEach((p) => {
    const amt = netPaise(p);
    const key = bucketKey(p.paymentDate, groupBy);
    const row = revenueByBucket.get(key) || { revenue: 0, orders: 0 };
    row.revenue += amt;
    if (p.type === 'payment') row.orders += 1;
    revenueByBucket.set(key, row);
    totalRevenuePaise += amt;
    if (p.type === 'payment') totalOrders += 1;
  });

  // COGS from dispensed units
  const cogsByBucket = new Map(buckets.map((b) => [b.key, 0]));
  const productMap = new Map();
  let totalCogsPaise = 0;
  let totalUnitsDispensed = 0;
  dispensings.forEach((d) => {
    const key = bucketKey(d.dispensedAt, groupBy);
    (d.items || []).forEach((it) => {
      const costPrice = (it.medicine && it.medicine.costPrice) || 0;
      const cogs = Math.round(it.quantity * costPrice * 100);
      cogsByBucket.set(key, (cogsByBucket.get(key) || 0) + cogs);
      totalCogsPaise += cogs;
      totalUnitsDispensed += it.quantity || 0;
      const pName = it.medicineName || (it.medicine && it.medicine.name) || 'Medicine';
      if (!productMap.has(pName)) {
        productMap.set(pName, { name: pName, category: (it.medicine && it.medicine.category) || '', quantity: 0, revenue: 0, cost: 0 });
      }
      const pRow = productMap.get(pName);
      pRow.quantity += it.quantity || 0;
      pRow.revenue += (it.quantity || 0) * (it.sellPrice || 0);
      pRow.cost += (it.quantity || 0) * costPrice;
    });
  });

  // Purchases per bucket
  const purchasesByBucket = new Map(buckets.map((b) => [b.key, 0]));
  let totalPurchasesPaise = 0;
  purchases.forEach((t) => {
    const key = bucketKey(t.createdAt, groupBy);
    const unitPrice = (t.batch && t.batch.purchasePrice) || (t.medicine && t.medicine.costPrice) || 0;
    const cost = Math.abs(t.quantityChange) * Math.round(unitPrice * 100);
    purchasesByBucket.set(key, (purchasesByBucket.get(key) || 0) + cost);
    totalPurchasesPaise += cost;
  });

  const salesTrend = rowSeries(buckets, revenueByBucket, { revenue: 0, orders: 0 });
  const purchaseTrend = rowSeries(buckets, purchasesByBucket, { cost: 0 });
  const profitTrend = rowSeries(buckets, cogsByBucket, { cost: 0 }).map((r, i) => ({
    ...r,
    revenue: salesTrend[i].revenue,
    profit: salesTrend[i].revenue - r.cost,
  }));

  const inventoryByCategory = Array.from(inventory.byCategory.values())
    .map((r) => ({
      category: r.category,
      label: categoryLabel(r.category),
      count: r.count,
      quantity: r.quantity,
      costValue: Math.round(r.costValue * 100) / 100,
      sellValue: Math.round(r.sellValue * 100) / 100,
    }))
    .sort((a, b) => b.sellValue - a.sellValue);

  const topProducts = Array.from(productMap.values())
    .map((r) => ({ ...r, revenue: Math.round(r.revenue * 100) / 100, cost: Math.round(r.cost * 100) / 100, profit: Math.round((r.revenue - r.cost) * 100) / 100 }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  const procedureCounts = {};
  trDocs.forEach((t) => {
    const proc = t.procedure || 'Other Procedure';
    procedureCounts[proc] = (procedureCounts[proc] || 0) + 1;
  });
  const topProcedures = Object.entries(procedureCounts)
    .map(([procedure, count]) => ({ procedure, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const recentActivity = await getRecentActivity({ limit: 12 });

  const totalRevenue = toRupees(totalRevenuePaise);
  const totalCost = toRupees(totalCogsPaise);
  const totalPurchases = toRupees(totalPurchasesPaise);

  return {
    period: { key: period, startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), groupBy },
    summary: {
      revenue: totalRevenue,
      orders: totalOrders,
      avgOrderValue: totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0,
      profit: Math.round((totalRevenue - totalCost) * 100) / 100,
      totalPatients: patientsTotal,
      newPatients,
      consultations,
      footfall,
      appointments,
      dispensedUnits: totalUnitsDispensed,
      lowStockCount: inventory.lowStock.length,
      inventoryCost: toRupees(inventory.costPaise),
      inventoryValue: toRupees(inventory.sellPaise),
      totalStock: inventory.totalStock,
      totalPurchases,
    },
    series: {
      salesTrend,
      purchaseTrend,
      profitTrend,
      salesPurchases: salesTrend.map((r, i) => ({
        ...r,
        purchases: purchaseTrend[i].cost,
        profit: r.revenue - purchaseTrend[i].cost,
      })),
    },
    inventoryByCategory,
    topProducts,
    topProcedures,
    lowStock: inventory.lowStock.slice(0, 10),
    recentActivity,
  };
}

// ---------------------------------------------------------------------------
// Sales report
// ---------------------------------------------------------------------------

async function getSalesReport({ startDate, endDate, groupBy } = {}) {
  const { start, end } = startOfRange({ startDate, endDate });
  const gb = groupBy || inferGroupBy(start, end);
  const buckets = buildBuckets(start, end, gb);
  const payments = await collectPayments(start, end);

  const byBucket = new Map(buckets.map((b) => [b.key, { revenue: 0, orders: 0 }]));
  const byMethod = new Map();
  const byProduct = new Map();
  let totalPaise = 0;
  let orders = 0;
  payments.forEach((p) => {
    const amt = netPaise(p);
    const key = bucketKey(p.paymentDate, gb);
    const row = byBucket.get(key) || { revenue: 0, orders: 0 };
    row.revenue += amt;
    if (p.type === 'payment') row.orders += 1;
    byBucket.set(key, row);
    totalPaise += amt;
    if (p.type === 'payment') orders += 1;
    const m = p.method || 'cash';
    byMethod.set(m, (byMethod.get(m) || 0) + amt);
    const patientName = p.patient ? `${p.patient.firstName} ${p.patient.lastName}`.trim() : 'Unknown';
    if (!byProduct.has(patientName)) byProduct.set(patientName, { name: patientName, revenue: 0 });
    byProduct.get(patientName).revenue += amt;
  });

  const trend = rowSeries(buckets, byBucket, { revenue: 0, orders: 0 });
  const revenueByMethod = Array.from(byMethod.entries())
    .map(([method, amt]) => ({ method, label: methodLabel(method), revenue: toRupees(amt) }))
    .sort((a, b) => b.revenue - a.revenue);
  const topPayers = Array.from(byProduct.entries())
    .map(([name, r]) => ({ name, revenue: toRupees(r.revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const totalRevenue = toRupees(totalPaise);
  return {
    period: { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), groupBy: gb },
    summary: {
      totalSales: totalRevenue,
      orders,
      avgOrderValue: orders > 0 ? Math.round((totalRevenue / orders) * 100) / 100 : 0,
    },
    trend,
    byMethod: revenueByMethod,
    topPayers,
  };
}

function methodLabel(m) {
  const labels = {
    cash: 'Cash',
    upi: 'UPI / QR',
    card: 'Card',
    'bank-transfer': 'Bank Transfer',
    other: 'Other',
  };
  return labels[m] || m;
}

// ---------------------------------------------------------------------------
// Purchase report
// ---------------------------------------------------------------------------

async function getPurchaseReport({ startDate, endDate, groupBy } = {}) {
  const { start, end } = startOfRange({ startDate, endDate });
  const gb = groupBy || inferGroupBy(start, end);
  const buckets = buildBuckets(start, end, gb);
  const purchases = await collectPurchases(start, end);

  const byBucket = new Map(buckets.map((b) => [b.key, { cost: 0, events: 0 }]));
  const bySupplier = new Map();
  const byCategory = new Map();
  let totalCostPaise = 0;
  purchases.forEach((t) => {
    const key = bucketKey(t.createdAt, gb);
    const unitPrice = (t.batch && t.batch.purchasePrice) || (t.medicine && t.medicine.costPrice) || 0;
    const cost = Math.abs(t.quantityChange) * Math.round(unitPrice * 100);
    const row = byBucket.get(key) || { cost: 0, events: 0 };
    row.cost += cost;
    row.events += 1;
    byBucket.set(key, row);
    totalCostPaise += cost;
    const supplier = (t.batch && t.batch.supplier) || (t.medicine && t.medicine.supplier) || 'Unspecified';
    if (!bySupplier.has(supplier)) bySupplier.set(supplier, { supplier, cost: 0, events: 0 });
    const sRow = bySupplier.get(supplier);
    sRow.cost += cost;
    sRow.events += 1;
    const cat = (t.medicine && t.medicine.category) || 'other';
    if (!byCategory.has(cat)) byCategory.set(cat, { category: cat, label: categoryLabel(cat), cost: 0, events: 0 });
    const cRow = byCategory.get(cat);
    cRow.cost += cost;
    cRow.events += 1;
  });

  const trend = rowSeries(buckets, byBucket, { cost: 0, events: 0 });
  const suppliers = Array.from(bySupplier.values())
    .map((r) => ({ ...r, cost: toRupees(r.cost) }))
    .sort((a, b) => b.cost - a.cost);
  const categories = Array.from(byCategory.values())
    .map((r) => ({ ...r, cost: toRupees(r.cost) }))
    .sort((a, b) => b.cost - a.cost);

  return {
    period: { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), groupBy: gb },
    summary: {
      totalPurchases: toRupees(totalCostPaise),
      purchaseEvents: purchases.length,
      supplierCount: suppliers.length,
    },
    trend,
    suppliers,
    categories,
  };
}

// ---------------------------------------------------------------------------
// Inventory report
// ---------------------------------------------------------------------------

async function getInventoryReport() {
  const inv = await collectInventory();
  const byCategory = Array.from(inv.byCategory.values())
    .map((r) => ({
      category: r.category,
      label: categoryLabel(r.category),
      count: r.count,
      quantity: r.quantity,
      costValue: Math.round(r.costValue * 100) / 100,
      sellValue: Math.round(r.sellValue * 100) / 100,
    }))
    .sort((a, b) => b.sellValue - a.sellValue);
  const outOfStock = inv.lowStock.filter((m) => m.quantity === 0);

  return {
    summary: {
      totalProducts: inv.meds.length,
      totalQuantity: inv.totalStock,
      inventoryCost: toRupees(inv.costPaise),
      inventoryValue: toRupees(inv.sellPaise),
      lowStock: inv.lowStock.length,
      outOfStock: outOfStock.length,
    },
    byCategory,
    lowStock: inv.lowStock.slice(0, 20),
    outOfStock: outOfStock.slice(0, 20),
  };
}

// ---------------------------------------------------------------------------
// Profit report
// ---------------------------------------------------------------------------

async function getProfitReport({ startDate, endDate, groupBy } = {}) {
  const { start, end } = startOfRange({ startDate, endDate });
  const gb = groupBy || inferGroupBy(start, end);
  const buckets = buildBuckets(start, end, gb);
  const [payments, dispensings] = await Promise.all([
    collectPayments(start, end),
    collectDispensing(start, end),
  ]);

  const revenueByBucket = new Map(buckets.map((b) => [b.key, 0]));
  const costByBucket = new Map(buckets.map((b) => [b.key, 0]));
  let totalRevenuePaise = 0;
  let totalCostPaise = 0;
  payments.forEach((p) => {
    const key = bucketKey(p.paymentDate, gb);
    const amt = netPaise(p);
    revenueByBucket.set(key, (revenueByBucket.get(key) || 0) + amt);
    totalRevenuePaise += amt;
  });
  dispensings.forEach((d) => {
    const key = bucketKey(d.dispensedAt, gb);
    (d.items || []).forEach((it) => {
      const cost = Math.round(it.quantity * ((it.medicine && it.medicine.costPrice) || 0) * 100);
      costByBucket.set(key, (costByBucket.get(key) || 0) + cost);
      totalCostPaise += cost;
    });
  });

  const trend = buckets.map((b) => ({
    key: b.key,
    label: b.label,
    revenue: toRupees(revenueByBucket.get(b.key) || 0),
    cost: toRupees(costByBucket.get(b.key) || 0),
    profit: toRupees((revenueByBucket.get(b.key) || 0) - (costByBucket.get(b.key) || 0)),
  }));

  const totalRevenue = toRupees(totalRevenuePaise);
  const totalCost = toRupees(totalCostPaise);
  return {
    period: { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), groupBy: gb },
    summary: {
      revenue: totalRevenue,
      cost: totalCost,
      grossProfit: Math.round((totalRevenue - totalCost) * 100) / 100,
      margin: totalRevenue > 0 ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 1000) / 10 : 0,
    },
    trend,
  };
}

// ---------------------------------------------------------------------------
// Product report (dispensing focus)
// ---------------------------------------------------------------------------

async function getProductReport({ startDate, endDate, groupBy } = {}) {
  const { start, end } = startOfRange({ startDate, endDate });
  const gb = groupBy || inferGroupBy(start, end);
  const dispensings = await collectDispensing(start, end);

  const productMap = new Map();
  const categoryMap = new Map();
  let totalUnits = 0;
  let totalRevenue = 0;
  let totalCost = 0;
  dispensings.forEach((d) => {
    (d.items || []).forEach((it) => {
      const qty = it.quantity || 0;
      const sell = qty * (it.sellPrice || 0);
      const cost = qty * ((it.medicine && it.medicine.costPrice) || 0);
      totalUnits += qty;
      totalRevenue += sell;
      totalCost += cost;
      const name = it.medicineName || (it.medicine && it.medicine.name) || 'Medicine';
      if (!productMap.has(name)) {
        productMap.set(name, { name, category: (it.medicine && it.medicine.category) || 'other', quantity: 0, revenue: 0, cost: 0 });
      }
      const pRow = productMap.get(name);
      pRow.quantity += qty;
      pRow.revenue += sell;
      pRow.cost += cost;
      const cat = (it.medicine && it.medicine.category) || 'other';
      if (!categoryMap.has(cat)) categoryMap.set(cat, { category: cat, label: categoryLabel(cat), quantity: 0, revenue: 0, cost: 0 });
      const cRow = categoryMap.get(cat);
      cRow.quantity += qty;
      cRow.revenue += sell;
      cRow.cost += cost;
    });
  });

  const topProducts = Array.from(productMap.values())
    .map((r) => ({ ...r, revenue: Math.round(r.revenue * 100) / 100, cost: Math.round(r.cost * 100) / 100 }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 20);
  const byCategory = Array.from(categoryMap.values())
    .map((r) => ({ ...r, revenue: Math.round(r.revenue * 100) / 100, cost: Math.round(r.cost * 100) / 100 }))
    .sort((a, b) => b.quantity - a.quantity);

  return {
    period: { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), groupBy: gb },
    summary: {
      totalUnits,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      profit: Math.round((totalRevenue - totalCost) * 100) / 100,
      productCount: productMap.size,
    },
    topProducts,
    byCategory,
  };
}

// ---------------------------------------------------------------------------
// Customer report (patient spend)
// ---------------------------------------------------------------------------

async function getCustomerReport({ startDate, endDate, groupBy } = {}) {
  const { start, end } = startOfRange({ startDate, endDate });
  const gb = groupBy || inferGroupBy(start, end);
  const buckets = buildBuckets(start, end, gb);
  const payments = await collectPayments(start, end);

  const byPatient = new Map();
  let totalPaise = 0;
  let activeCustomers = 0;
  payments.forEach((p) => {
    const amt = netPaise(p);
    totalPaise += amt;
    if (p.patient && p.patient._id) {
      const id = String(p.patient._id);
      if (!byPatient.has(id)) {
        byPatient.set(id, {
          id,
          name: `${p.patient.firstName || ''} ${p.patient.lastName || ''}`.trim() || 'Unknown',
          patientId: p.patient.patientId || '',
          revenue: 0,
          episodes: 0,
        });
        activeCustomers += 1;
      }
      const row = byPatient.get(id);
      row.revenue += amt;
      if (p.type === 'payment') row.episodes += 1;
    }
  });

  const newByBucket = new Map(buckets.map((b) => [b.key, 0]));
  const newPatients = await Patient.find({ createdAt: { $gte: start, $lte: end }, isArchived: false }).lean();
  newPatients.forEach((pt) => {
    const key = bucketKey(pt.createdAt, gb);
    newByBucket.set(key, (newByBucket.get(key) || 0) + 1);
  });

  const topCustomers = Array.from(byPatient.values())
    .map((c) => ({ ...c, revenue: Math.round(c.revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20);

  return {
    period: { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), groupBy: gb },
    summary: {
      totalCustomers: await Patient.countDocuments({ isArchived: false }),
      newCustomers: newPatients.length,
      activeCustomers,
      totalCustomerRevenue: toRupees(totalPaise),
    },
    newPatientsTrend: buckets.map((b) => ({ label: b.label, count: newByBucket.get(b.key) || 0 })),
    topCustomers,
  };
}

// ---------------------------------------------------------------------------
// Supplier report
// ---------------------------------------------------------------------------

async function getSupplierReport({ startDate, endDate } = {}) {
  const { start, end } = startOfRange({ startDate, endDate });
  const purchases = await collectPurchases(start, end);

  const bySupplier = new Map();
  let totalCostPaise = 0;
  purchases.forEach((t) => {
    const supplier = (t.batch && t.batch.supplier) || (t.medicine && t.medicine.supplier) || 'Unspecified';
    const unitPrice = (t.batch && t.batch.purchasePrice) || (t.medicine && t.medicine.costPrice) || 0;
    const cost = Math.abs(t.quantityChange) * Math.round(unitPrice * 100);
    totalCostPaise += cost;
    if (!bySupplier.has(supplier)) bySupplier.set(supplier, { supplier, cost: 0, events: 0, quantity: 0 });
    const row = bySupplier.get(supplier);
    row.cost += cost;
    row.events += 1;
    row.quantity += Math.abs(t.quantityChange);
  });

  const suppliers = Array.from(bySupplier.values())
    .map((r) => ({ ...r, cost: toRupees(r.cost) }))
    .sort((a, b) => b.cost - a.cost);

  return {
    period: { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) },
    summary: {
      totalSuppliers: suppliers.length,
      totalPurchases: toRupees(totalCostPaise),
      totalEvents: purchases.length,
      topSupplier: suppliers[0] ? suppliers[0].supplier : '—',
    },
    suppliers,
  };
}

// ---------------------------------------------------------------------------
// Clinical report (procedures + consultations)
// ---------------------------------------------------------------------------

async function getClinicalReport({ startDate, endDate, groupBy } = {}) {
  const { start, end } = startOfRange({ startDate, endDate });
  const gb = groupBy || inferGroupBy(start, end);
  const buckets = buildBuckets(start, end, gb);
  const [consultations, trDocs, appointments] = await Promise.all([
    Consultation.find({ visitDate: { $gte: start, $lte: end }, isArchived: false }).lean(),
    TreatmentRecord.find({ procedureDate: { $gte: start, $lte: end }, isArchived: false })
      .populate('doctor', 'name')
      .lean(),
    Appointment.find({ date: { $gte: start, $lte: end } }).populate('doctor', 'name').lean(),
  ]);

  const consByBucket = new Map(buckets.map((b) => [b.key, 0]));
  const apptByBucket = new Map(buckets.map((b) => [b.key, 0]));
  consultations.forEach((c) => {
    const key = bucketKey(c.consultationDate || c.createdAt || c.visitDate, gb);
    consByBucket.set(key, (consByBucket.get(key) || 0) + 1);
  });
  appointments.forEach((a) => {
    const key = bucketKey(a.date, gb);
    apptByBucket.set(key, (apptByBucket.get(key) || 0) + 1);
  });

  const procedureCounts = {};
  const byDoctor = new Map();
  trDocs.forEach((t) => {
    const proc = t.procedure || 'Other Procedure';
    procedureCounts[proc] = (procedureCounts[proc] || 0) + 1;
    const doctor = (t.doctor && t.doctor.name) || 'Unassigned';
    if (!byDoctor.has(doctor)) byDoctor.set(doctor, { doctor, procedures: 0 });
    byDoctor.get(doctor).procedures += 1;
  });

  const appointmentStatusCounts = {};
  appointments.forEach((a) => {
    const status = a.status || 'scheduled';
    appointmentStatusCounts[status] = (appointmentStatusCounts[status] || 0) + 1;
  });

  return {
    period: { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), groupBy: gb },
    summary: {
      consultations: consultations.length,
      appointments: appointments.length,
      procedures: trDocs.length,
      doctorCount: byDoctor.size,
    },
    consultationsTrend: buckets.map((b) => ({ label: b.label, count: consByBucket.get(b.key) || 0 })),
    appointmentsTrend: buckets.map((b) => ({ label: b.label, count: apptByBucket.get(b.key) || 0 })),
    topProcedures: Object.entries(procedureCounts)
      .map(([procedure, count]) => ({ procedure, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15),
    byDoctor: Array.from(byDoctor.values()).sort((a, b) => b.procedures - a.procedures),
    appointmentStatusCounts,
  };
}

// ---------------------------------------------------------------------------
// Executive analytics (parallel + revenue cross-module trend)
// ---------------------------------------------------------------------------

async function analyticsSeries({ startDate, endDate, groupBy } = {}) {
  const { start, end } = startOfRange({ startDate, endDate });
  const gb = groupBy || inferGroupBy(start, end);
  const buckets = buildBuckets(start, end, gb);
  const payments = await collectPayments(start, end);

  const revenueByBucket = new Map(buckets.map((b) => [b.key, 0]));
  payments.forEach((p) => {
    const key = bucketKey(p.paymentDate, gb);
    revenueByBucket.set(key, (revenueByBucket.get(key) || 0) + netPaise(p));
  });

  const totalPaise = Array.from(revenueByBucket.values()).reduce((a, b) => a + b, 0);
  return {
    period: { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), groupBy: gb },
    summary: { revenue: toRupees(totalPaise) },
    trend: buckets.map((b) => ({ label: b.label, revenue: toRupees(revenueByBucket.get(b.key) || 0) })),
  };
}

// ---------------------------------------------------------------------------
// Recent activity
// ---------------------------------------------------------------------------

async function getRecentActivity({ limit = 8 } = {}) {
  const { start, end } = startOfRange({ days: 14 });
  const [payments, dispensings, appointments] = await Promise.all([
    Payment.find({ paymentDate: { $gte: start, $lte: end }, isArchived: false })
      .populate('patient', 'firstName lastName patientId')
      .sort({ paymentDate: -1 })
      .limit(limit)
      .lean(),
    Dispensing.find({ dispensedAt: { $gte: start, $lte: end }, status: 'completed' })
      .populate('patient', 'firstName lastName')
      .sort({ dispensedAt: -1 })
      .limit(limit)
      .lean(),
    Appointment.find({ date: { $gte: start, $lte: end } })
      .populate('patient', 'firstName lastName')
      .sort({ date: -1 })
      .limit(limit)
      .lean(),
  ]);

  const items = [
    ...payments.map((p) => ({
      id: p._id,
      type: 'payment',
      title: p.type === 'refund' ? 'Refund processed' : 'Payment received',
      detail: p.patient ? `${p.patient.firstName} ${p.patient.lastName}`.trim() : 'Unknown patient',
      amount: toRupees(p.amountPaise),
      date: p.paymentDate,
    })),
    ...dispensings.map((d) => ({
      id: d._id,
      type: 'dispensing',
      title: `Dispensing ${d.dispensingNumber || ''}`.trim(),
      detail: d.patient ? `${d.patient.firstName} ${d.patient.lastName}`.trim() : 'Unknown patient',
      amount: (d.items || []).reduce((sum, it) => sum + (it.quantity || 0) * (it.sellPrice || 0), 0),
      date: d.dispensedAt,
    })),
    ...appointments.map((a) => ({
      id: a._id,
      type: 'appointment',
      title: `Appointment ${a.appointmentNumber || ''}`.trim(),
      detail: a.patient ? `${a.patient.firstName} ${a.patient.lastName}`.trim() : 'Unknown patient',
      amount: 0,
      date: a.date,
    })),
  ];
  items.sort((a, b) => new Date(b.date) - new Date(a.date));
  return items.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

module.exports = {
  startOfRange,
  buildBuckets,
  inferGroupBy,
  rowSeries,
  bucketKey,
  collectPayments,
  collectDispensing,
  collectPurchases,
  collectInventory,
  categoryLabel,
  netPaise,
  PERIOD_DAYS,
  getDashboardAnalytics,
  getSalesReport,
  getPurchaseReport,
  getInventoryReport,
  getProfitReport,
  getProductReport,
  getCustomerReport,
  getSupplierReport,
  getClinicalReport,
  analyticsSeries,
  getRecentActivity,
};
