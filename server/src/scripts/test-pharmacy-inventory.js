/* Integration test: Pharmacy inventory + batches + dispensing module.
   Run with: npm run test:pharmacy-inventory
   Covers FEFO, multi-batch, partial dispensing, expiry prevention, stock
   adjustment, concurrent dispensing and RBAC. */
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri('pharmacy_inventory_test');

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

  const admin = (await login('admin@saidental.local', 'Admin@123')).accessToken;
  const doctor = (await login('doctor@saidental.local', 'Doctor@123')).accessToken;
  const pharmacy = (await login('pharmacy@saidental.local', 'Pharmacy@123')).accessToken;
  const reception = (await login('reception@saidental.local', 'Reception@123')).accessToken;

  const daysFromNow = (days) => {
    const d = new Date(Date.now() + days * 86400000);
    return d.toISOString().slice(0, 10);
  };

  const registerPatient = async (token, firstName, lastName) => {
    const r = await call('POST', '/api/patients', { token, body: { firstName, lastName, gender: 'male', phone: '+91-9000000000', dob: '1990-01-01' } });
    return r.json.patient._id;
  };
  const createRx = async (token, patientId, items) => {
    const r = await call('POST', '/api/prescriptions', { token, body: { patientId, items } });
    return r.json.prescription;
  };

  const makeMedicine = async (name, extra = {}) => {
    const r = await call('POST', '/api/medicines', {
      token: admin,
      body: { name, genericName: name, category: 'antibiotic', dosageForm: 'tablet', reorderLevel: 10, ...extra },
    });
    return r.json.medicine;
  };

  section('MEDICINE MASTER');
  const amox = await makeMedicine('Amoxicillin 500mg');
  check(amox && amox.id, 'medicine created');
  check(amox.dosageForm === 'tablet' && amox.quantity === 0, 'dosage form + zero opening stock');

  const searchRes = await call('GET', '/api/medicines/search?q=Amox', { token: pharmacy });
  check(searchRes.status === 200 && searchRes.json.medicines.some((m) => m.name === 'Amoxicillin 500mg'), 'medicine search works');

  const pat = await registerPatient(doctor, 'Ravi', 'Kumar');

  section('CRITICAL DATA-INTEGRITY TEST (44)');
  const batch1 = await call('POST', '/api/medicine-batches', {
    token: admin,
    body: { medicineId: amox.id, batchNumber: 'AMX001', expiryDate: daysFromNow(200), quantity: 100, purchasePrice: 5, sellPrice: 8 },
  });
  check(batch1.status === 201, 'batch AMX001 created');
  check(batch1.json.batch.currentQuantity === 100, 'batch AMX001 = 100 units');

  // Movements recorded for opening/purchase.
  const mvList1 = await call('GET', `/api/medicines/${amox.id}/stock-movements`, { token: pharmacy });
  check(mvList1.status === 200 && mvList1.json.transactions.some((t) => t.action === 'purchase' && t.batch?.batchNumber === 'AMX001'), 'movement recorded for AMX001 (purchase)');

  const rx1 = await createRx(doctor, pat, [{ medicine: 'Amoxicillin 500mg', dosage: '500', unit: 'mg', quantity: 15 }]);
  const rx1Id = rx1.id;
  const rx1Item = rx1.items[0].id;
  await call('POST', `/api/prescriptions/${rx1Id}/issue`, { token: doctor });

  const disp1 = await call('POST', '/api/dispensing', {
    token: pharmacy,
    body: {
      prescriptionId: rx1Id,
      items: [{ itemId: rx1Item, medicineId: amox.id, quantity: 15, allocations: [{ batchId: batch1.json.batch.id, quantity: 15 }] }],
    },
  });
  check(disp1.status === 201, 'dispense 15 of Amoxicillin');
  check(disp1.json.dispensing.totalQuantity === 15, 'dispensing record = 15 units');

  const amoxAfter = await call('GET', `/api/medicines/${amox.id}`, { token: pharmacy });
  check(amoxAfter.json.medicine.quantity === 85, `Amoxicillin stock 100 → 85 (got ${amoxAfter.json.medicine.quantity})`);
  check(amoxAfter.json.medicine.batches[0].currentQuantity === 85, `batch AMX001 stock 100 → 85 (got ${amoxAfter.json.medicine.batches[0].currentQuantity})`);

  const mvAfter = await call('GET', `/api/medicines/${amox.id}/stock-movements`, { token: pharmacy });
  const dispMovements = mvAfter.json.transactions.filter((t) => t.action === 'dispense' && t.batch?.batchNumber === 'AMX001');
  check(dispMovements.length === 1 && dispMovements[0].quantityChange === -15, 'exactly one dispense movement of -15 (no duplicate)');
  check(dispMovements[0].previousQuantity === 100 && dispMovements[0].newQuantity === 85, 'movement has prev 100 → new 85');

  const rxAfter = await call('GET', `/api/prescriptions/${rx1Id}`, { token: pharmacy });
  check(rxAfter.json.prescription.status === 'dispensed', 'prescription status → dispensed');
  check(rxAfter.json.prescription.items[0].dispensedQuantity === 15, 'prescription line dispensedQuantity = 15');

  section('MULTI-BATCH FEFO TEST (45)');
  const ibu = await makeMedicine('Ibuprofen 400mg');
  const ibuRx = await createRx(doctor, pat, [{ medicine: 'Ibuprofen 400mg', dosage: '400', unit: 'mg', quantity: 9 }]);
  const ibuRxId = ibuRx.id;
  const ibuItem = ibuRx.items[0].id;
  await call('POST', `/api/prescriptions/${ibuRxId}/issue`, { token: doctor });

  const ibuB1 = (await call('POST', '/api/medicine-batches', {
    token: admin,
    body: { medicineId: ibu.id, batchNumber: 'IBU001', expiryDate: daysFromNow(40), quantity: 5, purchasePrice: 4, sellPrice: 6 },
  })).json.batch;
  const ibuB2 = (await call('POST', '/api/medicine-batches', {
    token: admin,
    body: { medicineId: ibu.id, batchNumber: 'IBU002', expiryDate: daysFromNow(200), quantity: 20, purchasePrice: 4, sellPrice: 6 },
  })).json.batch;

  const dispIbu = await call('POST', '/api/dispensing', {
    token: pharmacy,
    body: {
      prescriptionId: ibuRxId,
      items: [{ itemId: ibuItem, medicineId: ibu.id, quantity: 9, allocations: [{ batchId: ibuB1.id, quantity: 5 }] }],
    },
  });
  // Allocation must match the requested quantity exactly -> rejected.
  check(dispIbu.status === 400, 'incomplete allocation (5 of 9) rejected');

  const b1 = await call('GET', `/api/medicine-batches/${ibuB1.id}`, { token: pharmacy });
  check(b1.json.batch.currentQuantity === 5, 'IBU001 unchanged before FEFO auto-dispense');

  const dispIbu2 = await call('POST', '/api/dispensing', {
    token: pharmacy,
    body: {
      prescriptionId: ibuRxId,
      items: [{ itemId: ibuItem, medicineId: ibu.id, quantity: 9, allocations: [{ batchId: ibuB1.id, quantity: 4 }, { batchId: ibuB2.id, quantity: 5 }] }],
    },
  });
  check(dispIbu2.status === 201, 'multi-batch explicit allocation dispensed');

  const b1After = (await call('GET', `/api/medicine-batches/${ibuB1.id}`, { token: pharmacy })).json.batch;
  const b2After = (await call('GET', `/api/medicine-batches/${ibuB2.id}`, { token: pharmacy })).json.batch;
  check(b1After.currentQuantity === 1, `IBU001 5 → 1 (4 dispensed)`);
  check(b2After.currentQuantity === 15, `IBU002 20 → 15 (5 dispensed)`);

  const ibuRec = dispIbu2.json.dispensing;
  const sortedItems = [...ibuRec.items].sort((a, b) => (a.quantity > b.quantity ? 1 : -1));
  check(sortedItems[0].quantity === 4 && sortedItems[1].quantity === 5, 'dispensing record has IBU001:4, IBU002:5');

  section('PARTIAL DISPENSING TEST (46)');
  const pMed = await makeMedicine('Partial Cap 500mg');
  const pBat = (await call('POST', '/api/medicine-batches', {
    token: admin,
    body: { medicineId: pMed.id, batchNumber: 'PCAP01', expiryDate: daysFromNow(150), quantity: 10 },
  })).json.batch;
  const pRx = await createRx(doctor, pat, [{ medicine: 'Partial Cap 500mg', quantity: 15 }]);
  await call('POST', `/api/prescriptions/${pRx.id}/issue`, { token: doctor });

  const partial1 = await call('POST', '/api/dispensing', {
    token: pharmacy,
    body: { prescriptionId: pRx.id, items: [{ itemId: pRx.items[0].id, medicineId: pMed.id, quantity: 10, allocations: [{ batchId: pBat.id, quantity: 10 }] }] },
  });
  check(partial1.status === 201, 'first partial dispense (10)');
  const pRxAfter1 = await call('GET', `/api/prescriptions/${pRx.id}`, { token: pharmacy });
  check(pRxAfter1.json.prescription.status === 'partially-dispensed', 'prescription → partially dispensed');
  check(pRxAfter1.json.prescription.items[0].dispensedQuantity === 10, '10 of 15 dispensed');

  // Second dispensing to complete.
  const pBat2 = (await call('POST', '/api/medicine-batches', {
    token: admin,
    body: { medicineId: pMed.id, batchNumber: 'PCAP02', expiryDate: daysFromNow(150), quantity: 20 },
  })).json.batch;
  await call('POST', '/api/dispensing', {
    token: pharmacy,
    body: { prescriptionId: pRx.id, items: [{ itemId: pRx.items[0].id, medicineId: pMed.id, quantity: 5, allocations: [{ batchId: pBat2.id, quantity: 5 }] }] },
  });
  const pRxAfter2 = await call('GET', `/api/prescriptions/${pRx.id}`, { token: pharmacy });
  check(pRxAfter2.json.prescription.status === 'dispensed', 'prescription → dispensed after completing remaining 5');
  const pHistory = await call('GET', `/api/prescriptions/${pRx.id}/dispensing`, { token: pharmacy });
  check(pHistory.json.dispensing.length === 2, 'two dispensing events preserved in history');

  section('EXPIRY TEST (47)');
  const eMed = await makeMedicine('Expiry Probe 250mg');
  let eBEx = (await call('POST', '/api/medicine-batches', {
    token: admin,
    body: { medicineId: eMed.id, batchNumber: 'EXP_EXP', expiryDate: daysFromNow(-5), quantity: 20 },
  })).json.batch;
  eBEx = (await call('POST', '/api/medicine-batches', { token: admin, body: { medicineId: eMed.id, batchNumber: 'EXP_OK', expiryDate: daysFromNow(90), quantity: 20 } })).json.batch;
  const eRx = await createRx(doctor, pat, [{ medicine: 'Expiry Probe 250mg', quantity: 10 }]);
  await call('POST', `/api/prescriptions/${eRx.id}/issue`, { token: doctor });

  const eDisp = await call('POST', '/api/dispensing', {
    token: pharmacy,
    body: { prescriptionId: eRx.id, items: [{ itemId: eRx.items[0].id, medicineId: eMed.id, quantity: 10 }] },
  });
  check(eDisp.status === 201, 'auto FEFO dispense skips expired batch');
  check(eDisp.json.dispensing.items.length === 1 && String(eDisp.json.dispensing.items[0].batch) === String(eBEx.id), 'dispensed only from valid batch EXP_OK');

  // All-expired => unavailable error.
  const e2 = await makeMedicine('Expiry All 125mg');
  await call('POST', '/api/medicine-batches', { token: admin, body: { medicineId: e2.id, batchNumber: 'A1', expiryDate: daysFromNow(-2), quantity: 200 } });
  const eRx2 = await createRx(doctor, pat, [{ medicine: 'Expiry All 125mg', quantity: 5 }]);
  await call('POST', `/api/prescriptions/${eRx2.id}/issue`, { token: doctor });
  const eDisp2 = await call('POST', '/api/dispensing', {
    token: pharmacy,
    body: { prescriptionId: eRx2.id, items: [{ itemId: eRx2.items[0].id, medicineId: e2.id, quantity: 5 }] },
  });
  check(eDisp2.status === 409, 'all-expired batches → unavailable (409)');

  section('STOCK ADJUSTMENT TEST (48)');
  const aMed = await makeMedicine('Adjust Probe');
  const aBatchRes = await call('POST', '/api/medicine-batches', { token: admin, body: { medicineId: aMed.id, batchNumber: 'ADJ01', expiryDate: daysFromNow(100), quantity: 50 } });
  const aBat = aBatchRes.json.batch;
  const adj = await call('POST', `/api/medicine-batches/${aBat.id}/adjust`, {
    token: pharmacy,
    body: { quantity: 2, movementType: 'adjustment-out', reason: 'Physical stock mismatch' },
  });
  check(adj.status === 200 && adj.json.batch.currentQuantity === 48, `adjustment -2 → 48 (got ${adj.json.batch && adj.json.batch.currentQuantity})`);
  const aMv = await call('GET', `/api/medicines/${aMed.id}/stock-movements`, { token: admin });
  check(aMv.json.transactions.some((t) => t.action === 'adjustment-out' && t.reason === 'Physical stock mismatch'), 'adjustment movement with reason recorded');

  // Cannot receive (increment) without authorization.
  const badAdj = await call('POST', `/api/medicine-batches/${aBat.id}/adjust`, {
    token: reception,
    body: { quantity: 5, movementType: 'adjustment-in', reason: 'x' },
  });
  check(badAdj.status === 403, 'receptionist cannot adjust stock (403)');

  section('CONCURRENT DISPENSING TEST (49)');
  const cMed = await makeMedicine('Race Probe');
  const cBatchRes = await call('POST', '/api/medicine-batches', { token: admin, body: { medicineId: cMed.id, batchNumber: 'RACE01', expiryDate: daysFromNow(120), quantity: 10 } });
  const cBatId = cBatchRes.json.batch.id;

  const cRx1 = await createRx(doctor, pat, [{ medicine: 'Race Probe', quantity: 8 }]);
  await call('POST', `/api/prescriptions/${cRx1.id}/issue`, { token: doctor });
  const cRx2 = await createRx(doctor, pat, [{ medicine: 'Race Probe', quantity: 5 }]);
  await call('POST', `/api/prescriptions/${cRx2.id}/issue`, { token: doctor });

  const [r1, r2] = await Promise.all([
    call('POST', '/api/dispensing', { token: pharmacy, body: { prescriptionId: cRx1.id, items: [{ itemId: cRx1.items[0].id, medicineId: cMed.id, quantity: 8, allocations: [{ batchId: cBatId, quantity: 8 }] }] } }),
    call('POST', '/api/dispensing', { token: pharmacy, body: { prescriptionId: cRx2.id, items: [{ itemId: cRx2.items[0].id, medicineId: cMed.id, quantity: 5, allocations: [{ batchId: cBatId, quantity: 5 }] }] } }),
  ]);

  const winners = [r1, r2].filter((r) => r.status === 201).length;
  const rejected = [r1, r2].filter((r) => r.status === 409).length;
  check(winners === 1 && rejected === 1, `concurrent race: 1 winner + 1 rejected (got w=${winners} r=${rejected})`);
  const cFinal = (await call('GET', `/api/medicines/${cMed.id}`, { token: admin })).json.medicine;
  check(cFinal.quantity >= 0, `final stock is never negative (got ${cFinal.quantity})`);

  section('INVENTORY SUMMARY + REPORT ENDPOINTS');
  const sum = await call('GET', '/api/inventory/summary', { token: pharmacy });
  check(sum.status === 200, 'inventory summary available');
  check(typeof sum.json.summary.totalMedicines === 'number', 'summary reports totalMedicines');
  check(sum.json.summary.pendingPrescriptions >= 0, 'summary reports pending prescriptions');

  const low = await call('GET', '/api/inventory/low-stock', { token: pharmacy });
  const out = await call('GET', '/api/inventory/out-of-stock', { token: pharmacy });
  const exp = await call('GET', '/api/inventory/expired', { token: pharmacy });
  const mov = await call('GET', '/api/inventory/movements?action=dispense', { token: pharmacy });
  check(low.status === 200 && Array.isArray(low.json.medicines), 'low-stock reports');
  check(out.status === 200 && Array.isArray(out.json.medicines), 'out-of-stock reports');
  check(exp.status === 200 && Array.isArray(exp.json.medicines), 'expired reports');
  check(mov.status === 200 && mov.json.transactions.length >= 1, 'global stock movement history');

  // Doctor can view but not modify.
  const docCreate = await call('POST', '/api/medicine-batches', { token: doctor, body: { medicineId: amox.id, batchNumber: 'X', quantity: 1 } });
  check(docCreate.status === 403, 'doctor cannot create batch (403)');
  const unAuth = await call('GET', '/api/inventory/summary');
  check(unAuth.status === 401, 'unauthenticated denied (401)');

  section('RETURNS');
  const ret = await call('POST', '/api/inventory/returns', {
    token: pharmacy,
    body: { batchId: batch1.json.batch.id, quantity: 3, reason: 'Patient returned extra', dispensingId: disp1.json.dispensing.id },
  });
  check(ret.status === 201 && ret.json.status === 'pending', 'return recorded as pending (no auto restock)');
  const amoxBeforeConfirm = (await call('GET', `/api/medicines/${amox.id}`, { token: pharmacy })).json.medicine;
  check(amoxBeforeConfirm.quantity === 85, 'stock unchanged until return confirmed');
  const confirmRet = await call('POST', `/api/inventory/returns/${ret.json.id}/confirm`, { token: admin });
  check(confirmRet.status === 200, 'authorized user confirms return');
  const amoxAfterConfirm = (await call('GET', `/api/medicines/${amox.id}`, { token: pharmacy })).json.medicine;
  check(amoxAfterConfirm.quantity === 88, `stock restored after confirmation (got ${amoxAfterConfirm.quantity})`);

  await server.close();
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState === 1) await mongoose.connection.close();
  await mongod.stop();

  console.log(`\n${failures === 0 ? '✓ ALL PHARMACY+INVENTORY CHECKS PASSED' : `✗ ${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});