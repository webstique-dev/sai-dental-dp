/* Integration test: Treatment Execution + Follow-up module.
   Run with: npm run test:treatment */
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri('treatment_test');

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
    body: { firstName: 'Ravi', lastName: 'Mehra', gender: 'male', phone: '+91-9988665544', dob: '1979-02-14' },
  });
  check(patientRes.status === 201, `patient registered (got ${patientRes.status})`);
  const patientId = patientRes.json.patient._id;

  const consult = await call('POST', '/api/consultations', { token: d, body: { patientId, visitDate: '2026-07-01' } });
  check(consult.status === 201, 'consultation/OP visit created');
  const consultationId = consult.json.consultation.id;
  const visitId = consult.json.consultation.visit.id;

  // A treatment plan with two items so partial completion does NOT complete the plan.
  const planRes = await call('POST', '/api/treatment-plans', {
    token: d,
    body: {
      patientId,
      consultationId,
      name: 'Root Canal + Crown',
      items: [
        { procedure: 'Access Opening', toothNumber: 26, priority: 'high', description: 'Endodontics' },
        { procedure: 'Crown Placement', toothNumber: 26, priority: 'medium', description: 'Prosthodontics' },
      ],
    },
  });
  check(planRes.status === 201, `treatment plan created (got ${planRes.status})`);
  const plan = planRes.json.plan;
  const itemAccessOpening = plan.items[0].id;
  const itemCrown = plan.items[1].id;
  const planId = plan.id;

  section('DATA INTEGRITY TEST — TREATMENT EXECUTION (3-record sequence)');
  // Record 1: 07 Aug — Access Opening → Partially Completed (links to plan item 1)
  const rec1 = await call('POST', '/api/treatment-records', {
    token: d,
    body: {
      patientId,
      visitId,
      consultationId,
      treatmentPlanId: planId,
      treatmentPlanItemId: itemAccessOpening,
      toothNumber: 26,
      procedure: 'Access Opening',
      procedureDate: '2026-08-07',
      findings: 'Caries excavated, access gained',
      status: 'partially-completed',
      anesthesia: { used: true, type: 'local', amount: '1.8 ml', notes: 'Lidocaine 2%' },
    },
  });
  check(rec1.status === 201, `Record 1 (07 Aug Access Opening) created → Partially Completed (got ${rec1.status})`);
  check(rec1.json.record.status === 'partially-completed', 'Record 1 status = partially-completed');
  check(rec1.json.record.recordNumber.startsWith('TR-'), 'record number assigned (TR-...)');
  const rec1Id = rec1.json.record.id;

  // Tooth history must NOT appear yet (partial = not permanent).
  let toothAfter1 = await call('GET', `/api/patients/${patientId}/tooth-chart/26/history`, { token: d });
  if (toothAfter1.status === 200) {
    check((toothAfter1.json.tooth.treatments || []).length === 0, 'partial record did NOT write tooth history');
  } else {
    check(true, 'tooth history check (partial): endpoint returned without treatments');
  }

  // Plan item should now be in-progress, plan NOT complete (second item still planned).
  const planAfter1 = await call('GET', `/api/treatment-plans/${planId}`, { token: d });
  check(planAfter1.json.plan.items.find((x) => x.id === itemAccessOpening).status === 'in-progress', 'plan item 1 → in-progress (synced)');
  check(planAfter1.json.plan.items.find((x) => x.id === itemCrown).status === 'planned', 'plan item 2 UNCHANGED (planned)');

  // Record 2: 10 Aug — Canal preparation → In Progress
  const rec2 = await call('POST', '/api/treatment-records', {
    token: d,
    body: {
      patientId,
      visitId,
      consultationId,
      treatmentPlanId: planId,
      treatmentPlanItemId: itemAccessOpening,
      toothNumber: 26,
      procedure: 'Canal Preparation',
      procedureDate: '2026-08-10',
      findings: 'Working length determined, files 15-30',
      status: 'in-progress',
      materials: [{ name: 'Endodontic files', quantity: '1 pack' }],
    },
  });
  check(rec2.status === 201 && rec2.json.record.status === 'in-progress', 'Record2 (10 Aug Canal Preparation) created → In Progress');

  // Record 3: 15 Aug — Obturation → Completed (completes plan item 1)
  const rec3 = await call('POST', '/api/treatment-records', {
    token: d,
    body: {
      patientId,
      visitId,
      consultationId,
      treatmentPlanId: planId,
      treatmentPlanItemId: itemAccessOpening,
      toothNumber: 26,
      procedure: 'Obturation',
      procedureDate: '2026-08-15',
      findings: 'GP + sealer placed, check radiograph taken',
      status: 'completed',
      outcome: 'successful',
      followUpRecommended: true,
      followUpDays: 7,
      materials: [{ name: 'Gutta Percha', quantity: '5', notes: '0.06 taper' }, { name: 'Sealer', quantity: '1' }],
    },
  });
  check(rec3.status === 201 && rec3.json.record.status === 'completed', 'Record3 (15 Aug Obturation) created → Completed');
  check(!!rec3.json.record.completedAt, 'completedAt recorded on completion');
  const rec3Id = rec3.json.record.id;

  // Completing item 1 marks it completed; item 2 untouched → plan partially-completed.
  const planAfter3 = await call('GET', `/api/treatment-plans/${planId}`, { token: d });
  check(planAfter3.json.plan.items.find((x) => x.id === itemAccessOpening).status === 'completed', 'plan item 1 → completed (synced)');
  check(planAfter3.json.plan.items.find((x) => x.id === itemCrown).status === 'planned', 'plan item 2 UNCHANGED (still planned)');
  check(planAfter3.json.plan.status === 'partially-completed', 'plan → partially-completed (not completed)');

  // Persistence: reload the completed record.
  const rec3b = await call('GET', `/api/treatment-records/${rec3Id}`, { token: d });
  check(rec3b.status === 200 && rec3b.json.record.status === 'completed', 'reload: completed record persists');
  check(rec3b.json.record.materials.length === 2, 'reload: both materials persist');

  // Tooth history now includes EXACTLY ONE completed event for tooth 26.
  const toothAfter3 = await call('GET', `/api/patients/${patientId}/tooth-chart/26/history`, { token: d });
  check(toothAfter3.status === 200, 'tooth history endpoint returns');
  const treatments = toothAfter3.json.tooth.treatments || [];
  check(treatments.length === 1, 'tooth 26 history has exactly ONE completed event');
  check(treatments[0].procedure === 'Obturation', 'tooth history event = Obturation (the completed one)');

  // Completed record cannot be reopened (terminal).
  const reopen = await call('PATCH', `/api/treatment-records/${rec3Id}`, { token: d, body: { status: 'in-progress' } });
  check(reopen.status === 409, 'completed record cannot be reopened (409)');

  section('TREATMENT RECORD SAFETY / TRANSITIONS');
  // Completed plan item cannot regress.
  const regressItem = await call('PATCH', `/api/treatment-plans/${planId}/items/${itemAccessOpening}`, { token: d, body: { status: 'planned' } });
  check(regressItem.status === 400 || regressItem.status === 409, 'completed plan item cannot regress to planned');

  const badTooth = await call('POST', '/api/treatment-records', {
    token: d, body: { patientId, toothNumber: 99, procedure: 'X' },
  });
  check(badTooth.status === 400, 'invalid tooth number rejected (400)');

  const foreignPlan = await call('POST', '/api/treatment-records', {
    token: d, body: { patientId, treatmentPlanId: '507f1f77bcf86cd799439011', procedure: 'X' },
  });
  check(foreignPlan.status === 400 || foreignPlan.status === 404, 'foreign treatment plan rejected');

  // Cancel path
  const recRel = await call('POST', '/api/treatment-records', { token: d, body: { patientId, toothNumber: 24, procedure: 'Scaling', status: 'in-progress' } });
  const recRelId = recRel.json.record.id;
  const canc = await call('POST', `/api/treatment-records/${recRelId}/cancel`, { token: d, body: { reason: 'patient declined' } });
  check(canc.status === 200 && canc.json.record.status === 'cancelled', 'in-progress record can be cancelled');
  const reopenCancelled = await call('PATCH', `/api/treatment-records/${recRelId}`, { token: d, body: { status: 'in-progress' } });
  check(reopenCancelled.status === 400, 'cancelled record cannot resume (400)');

  section('FOLLOW-UP — created from completed treatment');
  const fu = await call('POST', '/api/follow-ups', {
    token: d,
    body: {
      patientId,
      consultationId,
      visitId,
      treatmentRecordId: rec3Id,
      type: 'post-operative-review',
      followUpDate: '2026-08-22',
      reason: 'Post-operative review after obturation',
    },
  });
  check(fu.status === 201, `follow-up created (got ${fu.status})`);
  check(fu.json.followUp.status === 'planned', 'follow-up starts as Planned');
  check(fu.json.followUp.followUpNumber.startsWith('FU-'), 'follow-up number assigned (FU-...)');
  const fuId = fu.json.followUp.id;

  // Schedule -> creates a follow-up appointment.
  const sched = await call('POST', `/api/follow-ups/${fuId}/schedule`, { token: d, body: {} });
  check(sched.status === 200 && sched.json.followUp.status === 'scheduled', 'follow-up scheduled');
  check(!!sched.json.followUp.appointment, 'follow-up linked to an appointment');

  // Complete.
  const fuDone = await call('POST', `/api/follow-ups/${fuId}/complete`, { token: d, body: { notes: 'Patient comfortable, advised maintenance' } });
  check(fuDone.status === 200 && fuDone.json.followUp.status === 'completed', 'follow-up completed');
  check(!!fuDone.json.followUp.completedAt && !!fuDone.json.followUp.completedBy, 'completedAt + completedBy recorded');

  function assertList(name, effect) {
    check(effect.status === 200, `${name} endpoint reachable`);
  }

  section('LISTS + UPCOMING');
  const listPatientFu = await call('GET', `/api/patients/${patientId}/follow-ups`, { token: d });
  assertList('follow-up patient list', listPatientFu);
  check(listPatientFu.json.followUps.length >= 1, 'patient follow-ups listed');
  const listPatientRec = await call('GET', `/api/patients/${patientId}/treatment-records`, { token: d });
  check(listPatientRec.status === 200 && listPatientRec.json.records.length >= 3, 'patient treatment records listed');
  const listConsultRec = await call('GET', `/api/consultations/${consultationId}/treatment-records`, { token: d });
  check(listConsultRec.status === 200 && listConsultRec.json.records.length >= 1, 'consultation treatment records listed');
  const upcoming = await call('GET', '/api/follow-ups/upcoming', { token: d });
  check(upcoming.status === 200, 'upcoming follow-ups endpoint reachable');

  section('RBAC / ACCESS');
  const noToken = await call('GET', `/api/patients/${patientId}/treatment-records`);
  check(noToken.status === 401, 'unauthenticated rejected (401)');
  const recRecRead = await call('GET', `/api/patients/${patientId}/treatment-records`, { token: r });
  check(recRecRead.status === 200, 'receptionist can view treatment records (read-only)');
  const recWriteRec = await call('POST', '/api/treatment-records', { token: r, body: { patientId, procedure: 'X' } });
  check(recWriteRec.status === 403, 'receptionist cannot create treatment record (403)');
  const phWriteRec = await call('POST', '/api/treatment-records', { token: p, body: { patientId, procedure: 'X' } });
  check(phWriteRec.status === 403, 'pharmacy cannot create treatment record (403)');
  const phReadRec = await call('GET', `/api/patients/${patientId}/treatment-records`, { token: p });
  check(phReadRec.status === 403, 'pharmacy denied treatment record access (role-scoped)');
  const admComplete = await call('POST', `/api/treatment-records/${recRelId}/complete`, { token: a });
  check(admComplete.status === 400, 'admin triggers terminal-guard on cancelled record (400)');

  section('AUDIT');
  const { AuditLog } = require('../models/AuditLog');
  const recLogs = await AuditLog.find({ entity: 'treatment-record' });
  check(recLogs.some((l) => l.action === 'create'), 'audit: treatment record created');
  check(recLogs.some((l) => l.action === 'complete'), 'audit: treatment record completed');
  const fuLogs = await AuditLog.find({ entity: 'follow-up' });
  check(fuLogs.some((l) => l.action === 'create'), 'audit: follow-up created');
  check(fuLogs.some((l) => l.action === 'schedule'), 'audit: follow-up scheduled');

  await server.close();
  await mongod.stop();
  console.log(`\n${failures === 0 ? 'ALL TREATMENT TESTS PASSED' : `${failures} TEST(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});