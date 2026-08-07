/* Integration test: clinical consultation + examination workflow.
   Run with: npm run test:consultation */
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri('consultation_test');

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
  const doctorId = doctor.user.id;
  const d = doctor.accessToken;
  const a = admin.accessToken;
  const r = reception.accessToken;
  const p = pharmacy.accessToken;

  section('PATIENT + CONSULTATION CREATION');
  const patientRes = await call('POST', '/api/patients', {
    token: d,
    body: {
      firstName: 'Anita',
      lastName: 'Sharma',
      gender: 'female',
      phone: '+91-9812345678',
      dob: '1990-05-12',
      permanentAlerts: ['Allergic to penicillin'],
    },
  });
  check(patientRes.status === 201, `patient registered (got ${patientRes.status})`);
  const patientId = patientRes.json.patient._id;
  check(/^PAT-\d{4}-\d{6}$/.test(patientRes.json.patient.patientId), 'patientId auto-generated');

  const noPatient = await call('POST', '/api/consultations', { token: d, body: {} });
  check(noPatient.status === 400, 'consultation without patient rejected');

  const createRes = await call('POST', '/api/consultations', {
    token: d,
    body: { patientId },
  });
  check(createRes.status === 201, `consultation created (got ${createRes.status})`);
  const consultation = createRes.json.consultation;
  const cid = consultation.id;
  check(consultation.status === 'draft', 'initial status is draft');
  check(/^OP-\d{4}-\d{6}$/.test(consultation.opNumber), 'opNumber auto-generated');
  check(consultation.doctor.id === doctorId, 'doctor assigned');

  const createByPharmacy = await call('POST', '/api/consultations', {
    token: p,
    body: { patientId },
  });
  check(createByPharmacy.status === 403, 'pharmacy cannot create consultation (403)');

  const adminCreate = await call('POST', '/api/consultations', {
    token: a,
    body: { patientId, doctorId },
  });
  check(adminCreate.status === 201, 'admin can create consultation with doctorId');

  section('CLINICAL DATA SAVE (DRAFT PERSISTENCE)');
  const clinical = {
    visitDate: new Date().toISOString(),
    medicalHistory: {
      conditions: [
        { name: 'Diabetes Mellitus', answer: 'yes', notes: 'since 2018' },
        { name: 'Hypertension', answer: 'no' },
        { name: 'Allergy', answer: 'yes', notes: 'penicillin' },
      ],
      takingMedication: 'yes',
      medications: [{ name: 'Metformin', dosage: '500 mg', frequency: 'Twice daily', notes: '' }],
      notes: 'Well controlled',
    },
    vitals: { systolic: '120', diastolic: '80', rbs: '98', rbsUnit: 'mg/dL', notes: '' },
    habits: {
      smoking: { present: true, frequency: '5/day', duration: '4 years', notes: '' },
      tobacco: { present: false },
      alcohol: { present: false },
      pan: { present: false },
    },
    dentalHistory: {
      previousExtractions: 'Tooth 48 extracted 2023',
      previousRootCanal: 'Tooth 16 RCT completed',
      clinicalNotes: 'Occasional sensitivity in lower left region',
    },
    extraoralExamination: {
      facialSymmetry: { status: 'normal', notes: '' },
      tmj: { status: 'normal', notes: '' },
      lymphNodes: { status: 'normal', notes: '' },
      swelling: { status: 'abnormal', notes: 'mild swelling right side' },
    },
    intraoralExamination: {
      tongue: { status: 'normal', notes: '' },
      gingiva: { status: 'abnormal', notes: 'generalized recession' },
    },
    gingivalFindings: { findings: ['Recession', 'Bleeding on Probing'], notes: 'upper anterior region' },
    hardTissueExamination: { summary: 'Tooth 26 caries suspected', notes: '' },
    clinicalFindings: 'Generalized recession with sensitivity. Tooth 26 occlusal caries suspected.',
  };

  const patchRes = await call('PATCH', `/api/consultations/${cid}`, {
    token: d,
    body: clinical,
  });
  check(patchRes.status === 200, `draft saved (got ${patchRes.status})`);

  const getRes = await call('GET', `/api/consultations/${cid}`, { token: d });
  check(getRes.status === 200, 'consultation loads after reload (GET)');
  const saved = getRes.json.consultation;
  check(saved.status === 'draft', 'still draft after save');
  check(saved.medicalHistory.conditions.length === 3, 'medical conditions list persisted');
  const dm = saved.medicalHistory.conditions.find((c) => c.name === 'Diabetes Mellitus');
  check(dm && dm.answer === 'yes', 'medical history answer persisted');
  check(saved.vitals.systolic === '120' && saved.vitals.rbs === '98', 'vitals persisted');
  check(saved.habits.smoking.present === true, 'habits persisted');
  check(saved.gingivalFindings.findings.includes('Recession'), 'gingival findings persisted');
  check(saved.clinicalFindings.includes('Tooth 26'), 'clinical findings persisted');

  section('ROLE ACCESS');
  const receptionView = await call('GET', `/api/consultations/${cid}`, { token: r });
  check(receptionView.status === 200, 'receptionist can view consultation');
  check(
    receptionView.json.consultation.clinicalFindings === undefined &&
      receptionView.json.consultation.opNumber,
    'receptionist sees status-only view (no clinical data)',
  );
  const receptionPatch = await call('PATCH', `/api/consultations/${cid}`, {
    token: r,
    body: { clinicalFindings: 'should not work' },
  });
  check(receptionPatch.status === 403, 'receptionist cannot edit (403)');
  const pharmacyView = await call('GET', `/api/consultations/${cid}`, { token: p });
  check(pharmacyView.status === 403, 'pharmacy cannot view consultation (403)');
  const noToken = await call('GET', `/api/consultations/${cid}`);
  check(noToken.status === 401, 'unauthenticated request rejected (401)');

  section('COMPLETION');
  const completeRes = await call('POST', `/api/consultations/${cid}/complete`, { token: d });
  check(completeRes.status === 200, `complete succeeded (got ${completeRes.status})`);
  check(completeRes.json.consultation.status === 'completed', 'status becomes completed');
  check(!!completeRes.json.consultation.completedAt, 'completedAt recorded');
  const doubleComplete = await call('POST', `/api/consultations/${cid}/complete`, { token: d });
  check(doubleComplete.status === 400, 're-complete rejected (400)');
  const editAfterComplete = await call('PATCH', `/api/consultations/${cid}`, {
    token: d,
    body: { clinicalFindings: 'nope' },
  });
  check(editAfterComplete.status === 400, 'edit after completion rejected (400)');

  const historyRes = await call('GET', `/api/patients/${patientId}/consultations`, { token: d });
  check(historyRes.status === 200, 'patient consultation history loads');
  const historyItems = historyRes.json.items;
  check(historyItems.some((c) => c.id === cid && c.status === 'completed'), 'completed consultation in patient history');

  section('AUDIT');
  const { AuditLog } = require('../models/AuditLog');
  const logs = await AuditLog.find({ entity: 'consultation', entityId: cid });
  const actions = logs.map((l) => l.action).sort();
  check(actions.includes('create'), 'audit: consultation created');
  check(actions.includes('update'), 'audit: consultation updated');
  check(actions.includes('complete'), 'audit: consultation completed');

  await server.close();
  await mongod.stop();
  console.log(`\n${failures === 0 ? 'ALL CONSULTATION TESTS PASSED' : `${failures} TEST(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});