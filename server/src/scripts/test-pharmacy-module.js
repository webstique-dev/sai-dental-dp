/* Integration test: Pharmacy / Dispensary Module (Queue, Dispensing, FEFO Stock Decrement, Low Stock Alert & Reports)
   Run with: node src/scripts/test-pharmacy-module.js */
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri('pharmacy_test');

  const { connectDB } = require('../config/db');
  await connectDB();
  const { createSeedUsers } = require('../utils/seed');
  await createSeedUsers();

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
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json };
  }

  // 1. Auth Logins
  section('1. Authentication');
  const docLogin = await call('POST', '/api/auth/login', {
    body: { email: 'doctor@saidental.local', password: 'Doctor@123' },
  });
  check(docLogin.status === 200 && docLogin.json.accessToken, 'Doctor login successful');
  const docToken = docLogin.json.accessToken;

  const pharmLogin = await call('POST', '/api/auth/login', {
    body: { email: 'pharmacy@saidental.local', password: 'Pharmacy@123' },
  });
  check(pharmLogin.status === 200 && pharmLogin.json.accessToken, 'Pharmacist login successful');
  const pharmToken = pharmLogin.json.accessToken;

  const adminLogin = await call('POST', '/api/auth/login', {
    body: { email: 'admin@saidental.local', password: 'Admin@123' },
  });
  const adminToken = adminLogin.json.accessToken;

  // 2. Inventory & Stock Batch Setup
  section('2. Stock Management & Batch Creation');
  const medRes = await call('POST', '/api/medicines', {
    token: pharmToken,
    body: {
      name: 'Amoxicillin 500mg',
      genericName: 'Amoxicillin',
      category: 'antibiotic',
      unit: 'capsule',
      reorderLevel: 20,
      costPrice: 5,
      sellPrice: 10,
    },
  });
  check(medRes.status === 201 && medRes.json.medicine, 'Medicine catalog entry created');
  const medId = medRes.json.medicine.id || medRes.json.medicine._id;

  const batchRes = await call('POST', '/api/medicine-batches', {
    token: pharmToken,
    body: {
      medicineId: medId,
      batchNumber: 'BATCH-AMX-001',
      quantity: 50,
      expiryDate: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
      purchasePrice: 5,
      sellPrice: 10,
    },
  });
  check(batchRes.status === 201 && batchRes.json.batch.currentQuantity === 50, 'Batch BATCH-AMX-001 created with 50 units');
  const batchId = batchRes.json.batch.id || batchRes.json.batch._id;

  // 3. Electronic Prescription Issued by Doctor
  section('3. Electronic Prescription');
  const patientRes = await call('POST', '/api/patients', {
    token: adminToken,
    body: {
      firstName: 'Ramesh',
      lastName: 'Kumar',
      phone: '9840998877',
      gender: 'male',
      dob: '1985-06-15',
    },
  });
  const patientId = patientRes.json.patient._id;

  const rxRes = await call('POST', '/api/prescriptions', {
    token: docToken,
    body: {
      patientId,
      items: [
        {
          medicineId: medId,
          medicine: 'Amoxicillin 500mg',
          dosage: '500',
          unit: 'mg',
          frequency: 'three-times-daily',
          duration: 5,
          quantity: 15,
        },
      ],
    },
  });
  check(rxRes.status === 201, 'Prescription created electronically');
  const rxId = rxRes.json.prescription.id || rxRes.json.prescription._id;

  const rxIssueRes = await call('POST', `/api/prescriptions/${rxId}/issue`, { token: docToken });
  check(rxIssueRes.status === 200 && rxIssueRes.json.prescription.status === 'issued', 'Prescription issued to pharmacy');

  // 4. Pharmacy Queue & Detail View
  section('4. Pharmacy Queue Retrieval');
  const pendingRes = await call('GET', '/api/pharmacy/pending', { token: pharmToken });
  check(pendingRes.status === 200 && pendingRes.json.prescriptions.length >= 1, 'Prescription queue fetched by pharmacist');

  const detailRes = await call('GET', `/api/pharmacy/prescriptions/${rxId}`, { token: pharmToken });
  check(detailRes.status === 200 && detailRes.json.prescription.availability, 'Prescription details with FEFO batch availability retrieved');
  const prescriptionItem = detailRes.json.prescription.items[0];

  // 5. Partial & Complete Dispensing with Auto Stock Decrement
  section('5. Medicine Dispensing & FEFO Stock Decrement');
  const partialRes = await call('POST', `/api/pharmacy/prescriptions/${rxId}/dispense`, {
    token: pharmToken,
    body: {
      items: [
        {
          itemId: prescriptionItem.id,
          medicineId: medId,
          quantity: 10,
        },
      ],
    },
  });
  check(partialRes.status === 200 && partialRes.json.prescription.status === 'partially-dispensed', '10 units partially dispensed');

  const medAfterPartial = await call('GET', `/api/medicines/${medId}`, { token: pharmToken });
  check(medAfterPartial.json.medicine.quantity === 40, 'Stock automatically decremented from 50 to 40');

  const completeRes = await call('POST', `/api/pharmacy/prescriptions/${rxId}/dispense`, {
    token: pharmToken,
    body: {
      items: [
        {
          itemId: prescriptionItem.id,
          medicineId: medId,
          quantity: 5,
        },
      ],
    },
  });
  check(completeRes.status === 200 && completeRes.json.prescription.status === 'dispensed', 'Remaining 5 units dispensed (prescription fully completed)');

  const medAfterComplete = await call('GET', `/api/medicines/${medId}`, { token: pharmToken });
  check(medAfterComplete.json.medicine.quantity === 35, 'Stock automatically decremented from 40 to 35');

  // 6. Manual Stock Adjustment & Low-Stock Alert
  section('6. Stock Adjustment & Low-Stock Alert');
  const stockOutRes = await call('POST', `/api/medicine-batches/${batchId}/adjust`, {
    token: pharmToken,
    body: {
      quantity: 25,
      movementType: 'damaged',
      reason: 'Water damaged box',
    },
  });
  check(stockOutRes.status === 200 && stockOutRes.json.batch.currentQuantity === 10, 'Stock adjusted down by 25 to 10');

  const lowStockCheck = await call('GET', `/api/medicines/${medId}`, { token: pharmToken });
  check(lowStockCheck.json.medicine.quantity <= lowStockCheck.json.medicine.reorderLevel, 'Medicine is below reorder level (10 <= 20)');

  // 7. Pharmacy Reports
  section('7. Pharmacy Operational Reports');
  const reportRes = await call('GET', '/api/reports/pharmacy', { token: pharmToken });
  check(reportRes.status === 200 && reportRes.json.summary.dispensing.totalUnits === 15, 'Daily Dispensing Report includes 15 dispensed units');
  check(reportRes.json.summary.lowStock.count >= 1, 'Low-Stock Reorder Report includes Amoxicillin');
  check(reportRes.json.summary.inventorySummary.totalRetailValue > 0, 'Stock-on-Hand Valuation summary computed');

  server.close();
  await mongod.stop();

  if (failures > 0) {
    console.error(`\nTest suite finished with ${failures} failure(s).`);
    process.exit(1);
  } else {
    console.log('\nAll Pharmacy module integration tests passed successfully!');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error during pharmacy test run:', err);
  process.exit(1);
});
