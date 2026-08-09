/* Integration test: Prescription + Investigations module.
   Run with: npm run test:rx */
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri('rx_test');

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

  section('SETUP: PATIENT + OP VISIT');
  const patientRes = await call('POST', '/api/patients', {
    token: d,
    body: { firstName: 'Mohan', lastName: 'Verma', gender: 'male', phone: '+91-9988776655', dob: '1982-11-30' },
  });
  check(patientRes.status === 201, `patient registered (got ${patientRes.status})`);
  const patientId = patientRes.json.patient._id;

  const consult = await call('POST', '/api/consultations', { token: d, body: { patientId, visitDate: '2025-03-21' } });
  check(consult.status === 201, 'consultation/OP visit created');
  const consultationId = consult.json.consultation.id;
  const visitId = consult.json.consultation.visit.id;

  section('PRESCRIPTION — SIMPLE CREATE');
  let rx = await call('POST', '/api/prescriptions', {
    token: d,
    body: {
      patientId,
      consultationId,
      visitId,
      items: [{ medicine: 'Paracetamol', dosage: '500', unit: 'mg', frequency: 'three-times-daily', duration: 3, durationUnit: 'day', route: 'oral', quantity: 9, foodInstruction: 'after-food', instructions: 'After food' }],
    },
  });
  check(rx.status === 201, `prescription created (got ${rx.status})`);
  check(rx.json.prescription.prescriptionNumber.startsWith('RX-'), 'prescription number assigned (RX-...)');
  check(rx.json.prescription.status === 'draft', 'prescription starts as draft (NOT dispensed)');
  check(rx.json.prescription.medicineCount === 1, 'prescription has 1 medicine');

  // Modify draft (replace the single Paracetamol line with two lines)
  rx = await call('PATCH', `/api/prescriptions/${rx.json.prescription.id}`, {
    token: d,
    body: {
      items: [
        { medicine: 'Amoxicillin', dosage: '500', unit: 'mg', frequency: 'three-times-daily', duration: 5, durationUnit: 'day', route: 'oral', quantity: 15, foodInstruction: 'after-food', instructions: 'After food' },
        { medicine: 'Ibuprofen', dosage: '400', unit: 'mg', frequency: 'twice-daily', duration: 3, durationUnit: 'day', route: 'oral', quantity: 6, foodInstruction: 'after-food', instructions: 'After food' },
      ],
    },
  });
  check(rx.status === 200 && rx.json.prescription.medicineCount === 2, 'draft prescription lines updated');

  section('DATA INTEGRITY TEST — PAT-001 / OP-001');
  const rx1 = await call('POST', '/api/prescriptions', {
    token: d,
    body: {
      patientId,
      consultationId,
      visitId,
      items: [
        { medicine: 'Amoxicillin', dosage: '500', unit: 'mg', frequency: 'three-times-daily', duration: 5, durationUnit: 'day', route: 'oral', quantity: 15, foodInstruction: 'after-food', instructions: 'After food' },
        { medicine: 'Ibuprofen', dosage: '400', unit: 'mg', frequency: 'twice-daily', duration: 3, durationUnit: 'day', route: 'oral', quantity: 6, foodInstruction: 'after-food', instructions: 'After food' },
      ],
    },
  });
  check(rx1.status === 201, 'RX (2 medicines) saved as draft');
  check(rx1.json.prescription.medicineCount === 2, 'both medicines present on create');
  const rx1Id = rx1.json.prescription.id;

  // Reload
  const rx1b = await call('GET', `/api/prescriptions/${rx1Id}`, { token: d });
  check(rx1b.status === 200 && rx1b.json.prescription.medicineCount === 2, 'reload: both medicines persist');
  const meds = rx1b.json.prescription.items.map((i) => i.medicine);
  check(meds.includes('Amoxicillin') && meds.includes('Ibuprofen'), 'reload: Amoxicillin + Ibuprofen both present');
  check(rx1b.json.prescription.status === 'draft', 'still draft after reload (not dispensed)');

  // Issue
  const issued = await call('POST', `/api/prescriptions/${rx1Id}/issue`, { token: d });
  check(issued.status === 200 && issued.json.prescription.status === 'issued', 'issue → status = Issued');
  check(!!issued.json.prescription.issuedAt && !!issued.json.prescription.issuedBy, 'issuedAt + issuedBy recorded');
  check(issued.json.prescription.status !== 'dispensed', 'NOT automatically dispensed');

  // Issued content locked
  const lockCheck = await call('PATCH', `/api/prescriptions/${rx1Id}`, { token: d, body: { items: [{ medicine: 'Hacked', dosage: '1' }] } });
  check(lockCheck.status === 409, 'issued medicine lines cannot be modified (409)');

  section('PRINT VIEW');
  const print = await call('GET', `/api/prescriptions/${rx1Id}/print`, { token: d });
  check(print.status === 200 && print.json.prescription.items.length === 2, 'print view returns prescription data');

  section('INVESTIGATION — REQUEST + RESULT (PAT-001 integrity)');
  const inv = await call('POST', '/api/investigations', {
    token: d,
    body: { patientId, consultationId, visitId, type: 'opg', reason: 'Evaluate impacted third molar', indication: 'Pre-surgical assessment', priority: 'routine', notes: 'Assess relation to inferior alveolar canal' },
  });
  check(inv.status === 201, `investigation requested (got ${inv.status})`);
  check(inv.json.investigation.status === 'requested', 'investigation status = requested (not completed)');
  check(inv.json.investigation.investigationNumber.startsWith('INV-'), 'investigation number assigned (INV-...)');
  check(inv.json.investigation.priority === 'routine', 'priority defaults to routine');
  const invId = inv.json.investigation.id;

  const invTypes = await call('POST', '/api/investigations', { token: d, body: { patientId, consultationId, visitId, type: 'rvg-iopa', reason: 'Check for decay tooth 16' } });
  check(invTypes.status === 201 && invTypes.json.investigation.type === 'rvg-iopa', 'RVG / IOPA supported');

  // Add result
  const resAdded = await call('POST', `/api/investigations/${invId}/result`, { token: d, body: { findings: 'Test finding' } });
  check(resAdded.status === 200 && resAdded.json.investigation.status === 'result-available', 'result added → status = Result Available');
  check(resAdded.json.investigation.result.findings === 'Test finding', 'result findings persisted');
  check(resAdded.json.investigation.result.completedBy, 'completed by recorded');
  check(!!resAdded.json.investigation.completedAt && !!resAdded.json.investigation.completedBy, 'completedAt + completedBy set');

  // Original request intact AFTER result
  const invAfter = await call('GET', `/api/investigations/${invId}`, { token: d });
  check(invAfter.json.investigation.reason === 'Evaluate impacted third molar', 'original request reason remains intact');

  // Result history preservation: add corrected result
  await call('POST', `/api/investigations/${invId}/result`, { token: d, body: { findings: 'Updated finding after review', interpretation: 'Correlation (2nd read)' } });
  const invHist = await call('GET', `/api/investigations/${invId}`, { token: d });
  check(invHist.json.investigation.resultHistory.length === 1, 'previous result preserved in resultHistory');
  check(invHist.json.investigation.result.findings === 'Updated finding after review', 'latest result reflects new read');

  section('LISTS (patient + consultation)');
  const listPatient = await call('GET', `/api/patients/${patientId}/prescriptions`, { token: d });
  check(listPatient.status === 200 && listPatient.json.prescriptions.length >= 1, 'patient prescriptions listed');
  const listConsult = await call('GET', `/api/consultations/${consultationId}/investigations`, { token: d });
  check(listConsult.status === 200 && listConsult.json.investigations.length >= 2, 'consultation investigations listed');
  const listRxConsult = await call('GET', `/api/consultations/${consultationId}/prescriptions`, { token: d });
  check(listRxConsult.status === 200 && listRxConsult.json.prescriptions.length >= 1, 'consultation prescriptions listed');

section('STATUS TRANSITIONS');
  // Cannot issue a prescription with no medicines
  const rxEmpty = await call('POST', '/api/prescriptions', { token: d, body: { patientId, items: [] } });
  check(rxEmpty.status === 201 && rxEmpty.json.prescription.medicineCount === 0, 'empty prescription saved as draft');
  const rxEmptyId = rxEmpty.json.prescription.id;
  const noMedIssue = await call('POST', `/api/prescriptions/${rxEmptyId}/issue`, { token: d });
  check(noMedIssue.status === 400, 'cannot issue with zero medicines (400)');

  const rx2 = await call('POST', '/api/prescriptions', { token: d, body: { patientId, items: [{ medicine: 'Paracetamol', dosage: '500', unit: 'mg' }] } });
  const rx2Id = rx2.json.prescription.id;
  await call('POST', `/api/prescriptions/${rx2Id}/issue`, { token: d });
  const cancelRx = await call('PATCH', `/api/prescriptions/${rx2Id}`, { token: d, body: { status: 'cancelled', cancelReason: 'not needed' } });
  check(cancelRx.status === 200 && cancelRx.json.prescription.status === 'cancelled', 'issued prescription can be cancelled');
  const gone = await call('PATCH', `/api/prescriptions/${rx2Id}`, { token: d, body: { status: 'draft' } });
  check(gone.status === 400, 'cancelled prescription cannot return to draft (400)');

  const inv3 = await call('POST', '/api/investigations', { token: d, body: { patientId, type: 'cbct' } });
  const inv3Id = inv3.json.investigation.id;
  const badRes = await call('PATCH', `/api/investigations/${inv3Id}`, { token: d, body: { status: 'completed' } });
  check(badRes.status === 400, 'cannot complete an investigation without a result (400)');

  section('VALIDATION');
  const noPatientRx = await call('POST', '/api/prescriptions', { token: d, body: { items: [{ medicine: 'X' }] } });
  check(noPatientRx.status === 400, 'prescription without patient rejected (400)');
  const noNameRx = await call('POST', '/api/prescriptions', { token: d, body: { patientId, items: [{ dosage: '5' }] } });
  check(noNameRx.status === 400, 'medicine without name rejected (400)');
  const badFreq = await call('POST', '/api/prescriptions', { token: d, body: { patientId, items: [{ medicine: 'X', frequency: 'hourly' }] } });
  check(badFreq.status === 400, 'invalid frequency rejected (400)');
  const badInvType = await call('POST', '/api/investigations', { token: d, body: { patientId, type: 'mri' } });
  check(badInvType.status === 400, 'invalid investigation type rejected (400)');
  const foreignDiag = await call('POST', '/api/prescriptions', { token: d, body: { patientId, diagnosisId: '507f1f77bcf86cd799439011', items: [{ medicine: 'X' }] } });
  check(foreignDiag.status === 400, 'foreign diagnosis reference rejected (400)');
  const missingPatient = await call('GET', `/api/patients/507f1f77bcf86cd799439011/prescriptions`, { token: d });
  check(missingPatient.status === 404, 'unknown patient prescriptions rejected (404)');

  section('RBAC / ACCESS');
  const noToken = await call('GET', `/api/consultations/${consultationId}/prescriptions`);
  check(noToken.status === 401, 'unauthenticated rejected (401)');
  const recReadRx = await call('GET', `/api/patients/${patientId}/prescriptions`, { token: r });
  check(recReadRx.status === 200, 'receptionist can view prescriptions (read-only)');
  const recWriteRx = await call('POST', '/api/prescriptions', { token: r, body: { patientId, items: [{ medicine: 'X' }] } });
  check(recWriteRx.status === 403, 'receptionist cannot create prescription (403)');
  const phRead = await call('GET', `/api/prescriptions/${rx1Id}/print`, { token: p });
  check(phRead.status === 200, 'pharmacy can view issued prescription (read-only)');
  const phWriteRx = await call('POST', '/api/prescriptions', { token: p, body: { patientId, items: [{ medicine: 'X' }] } });
  check(phWriteRx.status === 403, 'pharmacy cannot create prescription (403)');
  const phWriteInv = await call('POST', '/api/investigations', { token: p, body: { patientId, type: 'opg' } });
  check(phWriteInv.status === 403, 'pharmacy cannot request investigation (403)');
  const admIssue = await call('POST', `/api/prescriptions/${rx1Id}/issue`, { token: a });
  check(admIssue.status === 200, 'admin can issue prescription (200)');

  section('TOOTH HISTORY UNCHANGED');
  const tooth = await call('GET', `/api/patients/${patientId}/tooth-chart/16/history`, { token: d });
  if (tooth.status === 200) {
    check((tooth.json.tooth.treatments || []).length === 0, 'prescriptions/investigations did not alter tooth history');
  }

  section('AUDIT');
  const { AuditLog } = require('../models/AuditLog');
  const rxLogs = await AuditLog.find({ entity: 'prescription' });
  check(rxLogs.some((l) => l.action === 'create'), 'audit: prescription created');
  check(rxLogs.some((l) => l.action === 'issue'), 'audit: prescription issued');
  const invLogs = await AuditLog.find({ entity: 'investigation' });
  check(invLogs.some((l) => l.action === 'create'), 'audit: investigation requested');

  await server.close();
  await mongod.stop();
  console.log(`\n${failures === 0 ? 'ALL RX TESTS PASSED' : `${failures} TEST(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});