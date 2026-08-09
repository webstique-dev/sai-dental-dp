/* Integration test: Pharmacy / Inventory + Dispensing module.
   Run with: npm run test:pharmacy */
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri('pharmacy_test');

  const { connectDB } = require('../config/db');
  await connectDB();
  const { createSeedUsers, createSeedMedicines } = require('../utils/seed');
  await createSeedUsers();
  await createSeedMedicines();

  const app = require('../app');
  const server = await new Promise((resolve) => {
    const srv = app.listen(0, () => resolve(srv));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  let failures = 0;
  const pass = (m) => console.log('  [PASS]', m);
  const fail = (m) => {
    failures += 1;
    console.error('  [FAIL]', m);
  };
  const check = (cond, msg) => (cond ? pass(msg) : fail(msg));
  const section = (t) => console.log(`\n--- ${t} ---`);

  async function call(method, path, { body, token } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(base + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try {
      json = await res.json();
    } catch {}
    return { status: res.status, json };
  }

  const login = async (email, password) => {
    const r = await call('POST', '/api/auth/login', { body: { email, password } });
    return r.json;
  };

  const doctor = await login('doctor@saidental.local', 'Doctor@123');
  const admin = await login('admin@saidental.local', 'Admin@123');
  const reception = await login('reception@saidental.local', 'Reception@123');
  const pharmacy = await login('pharmacy@saidental.local', 'Pharmacy@123');
  const d = doctor.accessToken;
  const a = admin.accessToken;
  const r = reception.accessToken;
  const p = pharmacy.accessToken;

  section('SETUP: PATIENT + PRESCRIPTION');
  const patientRes = await call('POST', '/api/patients', {
    token: d,
    body: { firstName: 'Vinod', lastName: 'Menon', gender: 'male', phone: '+91-9444566777', dob: '1980-03-20' },
  });
  check(patientRes.status === 201, 'patient registered');
  const patientId = patientRes.json.patient._id;

  const rx = await call('POST', '/api/prescriptions', {
    token: d,
    body: {
      patientId,
      items: [
        { medicine: 'Amoxicillin 500mg', dosage: '500', unit: 'mg', frequency: 'three-times-daily', duration: 5, durationUnit: 'day', route: 'oral', quantity: 15 },
        { medicine: 'Ibuprofen 400mg', dosage: '400', unit: 'mg', frequency: 'twice-daily', duration: 3, durationUnit: 'day', route: 'oral', quantity: 6 },
      ],
    },
  });
  check(rx.status === 201, 'prescription saved by doctor');
  const rxId = rx.json.prescription.id;
  const rxItems = rx.json.prescription.items;

  const issued = await call('POST', `/api/prescriptions/${rxId}/issue`, { token: d });
  check(issued.status === 200 && issued.json.prescription.status === 'issued', 'prescription issued');

  section('MEDICINE INVENTORY — SEED + LIST');
  const medList = await call('GET', '/api/medicines', { token: p });
  check(medList.status === 200 && medList.json.medicines.length >= 10, `seed medicines listable by pharmacy (${medList.json.medicines.length})`);
  const amox = medList.json.medicines.find((m) => m.name === 'Amoxicillin 500mg');
  const ibu = medList.json.medicines.find((m) => m.name === 'Ibuprofen 400mg');
  check(!!amox && amox.quantity === 200, 'seed Amoxicillin at qty 200');
  check(!!ibu && ibu.quantity === 300, 'seed Ibuprofen at qty 300');

  const docList = await call('GET', '/api/medicines', { token: d });
  check(docList.status === 200, 'doctor can view medicine catalog');

  const phCreate = await call('POST', '/api/medicines', {
    token: p,
    body: { name: 'Test Med 250', genericName: 'Test', category: 'analgesic', quantity: 50, reorderLevel: 10, costPrice: 20, sellPrice: 25, supplier: 'X Corp' },
  });
  check(phCreate.status === 201, 'pharmacy can create a medicine');
  const testMedId = phCreate.json.medicine.id;

  const receptionCreate = await call('POST', '/api/medicines', { token: r, body: { name: 'No', quantity: 1 } });
  check(receptionCreate.status === 403, 'receptionist cannot create medicines (403)');
  const noToken = await call('GET', '/api/medicines');
  check(noToken.status === 401, 'unauthenticated rejected (401)');

  section('MEDICINE — VALIDATION');
  const noName = await call('POST', '/api/medicines', { token: p, body: { name: '', quantity: 1 } });
  check(noName.status === 400, 'medicine without name rejected (400)');
  const negQty = await call('POST', '/api/medicines', { token: p, body: { name: 'Neg', quantity: -5 } });
  check(negQty.status === 400, 'negative quantity rejected (400)');
  const badCat = await call('POST', '/api/medicines', { token: p, body: { name: 'Bad', quantity: 1, category: 'space' } });
  check(badCat.status === 400, 'invalid category rejected (400)');

  section('STOCK MOVEMENTS');
  // Stock-in: add 25 to Test Med.
  const stockIn = await call('POST', `/api/medicines/${testMedId}/stock-in`, { token: p, body: { quantity: 25, notes: 'Restock batch B2' } });
  check(stockIn.status === 200 && stockIn.json.medicine.quantity === 75, `stock-in 25 → qty 75 (got ${stockIn.json.medicine && stockIn.json.medicine.quantity})`);

  // Stock-out: remove 10.
  const stockOut = await call('POST', `/api/medicines/${testMedId}/stock-out`, { token: p, body: { quantity: 10 } });
  check(stockOut.status === 200 && stockOut.json.medicine.quantity === 65, `stock-out 10 → qty 65 (got ${stockOut.json.medicine && stockOut.json.medicine.quantity})`);

  // Cannot remove more than available.
  const overRemove = await call('POST', `/api/medicines/${testMedId}/stock-out`, { token: p, body: { quantity: 5000 } });
  check(overRemove.status === 409, 'over-removal blocked (409)');

  // Invalid movements.
  const zeroIn = await call('POST', `/api/medicines/${testMedId}/stock-in`, { token: p, body: { quantity: 0 } });
  check(zeroIn.status === 400, 'zero stock-in rejected (400)');

  // Ledger records.
  const txList = await call('GET', `/api/medicines/${testMedId}/transactions`, { token: p });
  check(txList.status === 200 && txList.json.transactions.length >= 3, 'per-medicine ledger tracked');

  // Only pharmacy/admin can move stock.
  const doctorMove = await call('POST', `/api/medicines/${testMedId}/stock-in`, { token: d, body: { quantity: 5 } });
  check(doctorMove.status === 403, 'doctor cannot move stock (403)');

  section('STOCK ALERTS');
  // Create a medicine just above reorder, then drain it below.
  const near = await call('POST', '/api/medicines', { token: p, body: { name: 'LowStock Probe', quantity: 8, reorderLevel: 10 } });
  check(near.status === 201, 'probe medicine created');
  const nearId = near.json.medicine.id;
  const lowList = await call('GET', '/api/medicines?lowStock=true', { token: p });
  check(lowList.status === 200 && lowList.json.medicines.some((m) => m.id === nearId), 'low-stock filter surfaces probe');

  const empty = await call('POST', '/api/medicines', { token: p, body: { name: 'OutStock Probe', quantity: 0, reorderLevel: 5 } });
  const outList = await call('GET', '/api/medicines?outOfStock=true', { token: p });
  check(outList.status === 200 && outList.json.medicines.some((m) => m.id === empty.json.medicine.id), 'out-of-stock filter surfaces probe');

  const expiring = await call('POST', '/api/medicines', {
    token: p,
    body: { name: 'Expiring Probe', quantity: 10, reorderLevel: 2, expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) },
  });
  const soonList = await call('GET', '/api/medicines?expiringSoon=true', { token: p });
  check(soonList.status === 200 && soonList.json.medicines.some((m) => m.id === expiring.json.medicine.id), 'expiring-soon filter surfaces probe');

  const expired = await call('POST', '/api/medicines', {
    token: p,
    body: { name: 'Expired Probe', quantity: 10, reorderLevel: 2, expiryDate: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10) },
  });
  const expList = await call('GET', '/api/medicines?expired=true', { token: p });
  check(expList.status === 200 && expList.json.medicines.some((m) => m.id === expired.json.medicine.id), 'expired filter surfaces probe');

  section('DISPENSING — FULL DISPENSE');
  // Prescription: Amoxicillin ×15, Ibuprofen ×6. Both in stock.
  const rxView = await call('GET', `/api/pharmacy/prescriptions/${rxId}`, { token: p });
  check(rxView.status === 200 && rxView.json.prescription.id === rxId, 'dispense view loads prescription');

  const pendingBefore = await call('GET', '/api/pharmacy/pending', { token: p });
  check(pendingBefore.status === 200 && pendingBefore.json.prescriptions.some((x) => x.id === rxId), 'issued prescription in pending queue');

  const dispenseFull = await call('POST', `/api/pharmacy/prescriptions/${rxId}/dispense`, {
    token: p,
    body: {
      items: [
        { itemId: rxItems[0].id, medicineId: amox.id, quantity: 15 },
        { itemId: rxItems[1].id, medicineId: ibu.id, quantity: 6 },
      ],
    },
  });
  check(dispenseFull.status === 200 && dispenseFull.json.prescription.status === 'dispensed', 'full dispense → status Dispensed');
  check(dispenseFull.json.prescription.items[0].dispensedQuantity === 15, 'Amoxicillin dispensedQuantity = 15');
  check(dispenseFull.json.prescription.items[1].dispensedQuantity === 6, 'Ibuprofen dispensedQuantity = 6');
  check(!!dispenseFull.json.prescription.dispensedAt && !!dispenseFull.json.prescription.dispensedBy, 'dispensedAt + dispensedBy recorded');

  // Stock deducted.
  const amoxAfter = await call('GET', `/api/medicines/${amox.id}`, { token: p });
  check(amoxAfter.json.medicine.quantity === 185, `Amoxicillin qty 200 → 185 (got ${amoxAfter.json.medicine.quantity})`);
  const ibuAfter = await call('GET', `/api/medicines/${ibu.id}`, { token: p });
  check(ibuAfter.json.medicine.quantity === 294, `Ibuprofen qty 300 → 294 (got ${ibuAfter.json.medicine.quantity})`);

  // Dispense ledger linked to prescription.
  const rxTx = await call('GET', `/api/medicines/${amox.id}/transactions`, { token: p });
  check(rxTx.json.transactions.some((t) => t.action === 'dispense' && t.refType === 'prescription' && String(t.refId) === rxId), 'dispense transaction linked to prescription');

  // Cannot dispense an already-dispensed prescription.
  const reDispense = await call('POST', `/api/pharmacy/prescriptions/${rxId}/dispense`, {
    token: p,
    body: { items: [{ itemId: rxItems[0].id, medicineId: amox.id, quantity: 1 }] },
  });
  check(reDispense.status === 409, 'already-dispensed prescription rejected (409)');

  section('DISPENSING — PARTIAL + GUARDS');
  // A new prescription; dispense only some units → partially-dispensed.
  const rx2 = await call('POST', '/api/prescriptions', {
    token: d,
    body: { patientId, items: [{ medicine: 'Amoxicillin 500mg', dosage: '500', unit: 'mg', frequency: 'three-times-daily', quantity: 15 }] },
  });
  const rx2Id = rx2.json.prescription.id;
  const rx2ItemId = rx2.json.prescription.items[0].id;
  await call('POST', `/api/prescriptions/${rx2Id}/issue`, { token: d });

  const partial = await call('POST', `/api/pharmacy/prescriptions/${rx2Id}/dispense`, {
    token: p,
    body: { items: [{ itemId: rx2ItemId, medicineId: amox.id, quantity: 6 }] },
  });
  check(partial.status === 200 && partial.json.prescription.status === 'partially-dispensed', 'partial dispense → Partially Dispensed');

  // Over-dispense beyond prescribed quantity → rejected.
  const overRx = await call('POST', `/api/pharmacy/prescriptions/${rx2Id}/dispense`, {
    token: p,
    body: { items: [{ itemId: rx2ItemId, medicineId: amox.id, quantity: 20 }] },
  });
  check(overRx.status === 400, 'dispense beyond prescribed quantity rejected (400)');

  // Dispense more than stock → rejected.
  const rx3 = await call('POST', '/api/prescriptions', {
    token: d,
    body: { patientId, items: [{ medicine: 'Test Med 250', quantity: 999 }] },
  });
  const rx3Id = rx3.json.prescription.id;
  const rx3ItemId = rx3.json.prescription.items[0].id;
  await call('POST', `/api/prescriptions/${rx3Id}/issue`, { token: d });
  const noStock = await call('POST', `/api/pharmacy/prescriptions/${rx3Id}/dispense`, {
    token: p,
    body: { items: [{ itemId: rx3ItemId, medicineId: testMedId, quantity: 999 }] },
  });
  check(noStock.status === 409, 'dispense beyond stock rejected (409)');

  // Mismatched item / inactive medicine.
  const badItem = await call('POST', `/api/pharmacy/prescriptions/${rx2Id}/dispense`, {
    token: p,
    body: { items: [{ itemId: '000000000000000000000000', medicineId: amox.id, quantity: 1 }] },
  });
  check(badItem.status === 400, 'unknown item id rejected (400)');

  section('PHARMACY DASHBOARD SUMMARY');
  const summary = await call('GET', '/api/pharmacy/summary', { token: p });
  check(summary.status === 200, 'pharmacy summary available');
  check(summary.json.summary.dispensedToday === 3, `dispensedToday = 3 units moved (got ${summary.json.summary.dispensedToday})`);
  check(summary.json.summary.pending === 2, `pending = 2 (one partial + one issued; got ${summary.json.summary.pending})`);
  check(summary.json.summary.lowStockCount >= 1, 'low-stock count reported');
  check(summary.json.summary.recentDispenses.length >= 1, 'recent dispensing listed');

  const summaryNoAuth = await call('GET', '/api/pharmacy/summary', { token: d });
  check(summaryNoAuth.status === 403, 'doctor denied pharmacy summary (403)');

  section('AUDIT TRAIL');
  const { AuditLog } = require('../models/AuditLog');
  const medLogs = await AuditLog.find({ entity: 'medicine' });
  const txLogs = await AuditLog.find({ entity: 'inventory-transaction' });
  const rxLogs = await AuditLog.find({ entity: 'prescription', action: 'dispense' });
  check(medLogs.some((l) => l.action === 'create'), 'audit: medicine created');
  check(txLogs.length >= 2, 'audit: stock transactions logged');
  check(rxLogs.length >= 2, 'audit: prescription dispensed');

  await server.close();
  await mongooseDisconnect();
  await mongod.stop();

  console.log(`\n${failures === 0 ? '✓ ALL PHARMACY CHECKS PASSED' : `✗ ${failures} PHARMACY CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

async function mongooseDisconnect() {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState === 1) await mongoose.connection.close();
}

main().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});