/* Integration test: Diagnosis + Treatment Plan module.
   Run with: npm run test:diagnosis */
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri('diagnosis_test');

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
    body: { firstName: 'Anita', lastName: 'Sharma', gender: 'female', phone: '+91-9988776655', dob: '1990-05-22' },
  });
  check(patientRes.status === 201, `patient registered (got ${patientRes.status})`);
  const patientId = patientRes.json.patient._id;

  const consult = await call('POST', '/api/consultations', { token: d, body: { patientId, visitDate: '2025-02-14' } });
  check(consult.status === 201, 'consultation/OP visit created');
  const consultationId = consult.json.consultation.id;
  const visitId = consult.json.consultation.visit.id;

  section('DIAGNOSIS: CREATE + LIST + UPDATE');
  const diagRes = await call('POST', '/api/diagnoses', {
    token: d,
    body: {
      patientId,
      consultationId,
      visitId,
      name: 'Deep Dental Caries',
      category: 'dental',
      toothNumber: 16,
      findings: 'Extensive decay involving pulp on tooth 16',
      notes: 'RCT indicated',
    },
  });
  check(diagRes.status === 201, `diagnosis created (got ${diagRes.status})`);
  check(diagRes.json.diagnosis.toothNumber === 16 && diagRes.json.diagnosis.hasTooth === true, 'diagnosis linked to tooth 16');
  check(diagRes.json.diagnosis.status === 'active', 'diagnosis defaults to active');
  const diagId = diagRes.json.diagnosis.id;

  const diagListC = await call('GET', `/api/consultations/${consultationId}/diagnoses`, { token: d });
  check(diagListC.status === 200 && diagListC.json.diagnoses.length === 1, 'diagnoses listed per consultation');
  const diagListP = await call('GET', `/api/patients/${patientId}/diagnoses`, { token: d });
  check(diagListP.status === 200 && diagListP.json.diagnoses.length === 1, 'diagnoses listed per patient');

  const diagUpd = await call('PATCH', `/api/diagnoses/${diagId}`, { token: d, body: { status: 'active', notes: 'Plan RCT next' } });
  check(diagUpd.status === 200 && diagUpd.json.diagnosis.notes === 'Plan RCT next', 'diagnosis updated');

  const generalDiag = await call('POST', '/api/diagnoses', {
    token: d,
    body: { patientId, name: 'Gingivitis', category: 'oral' },
  });
  check(generalDiag.status === 201 && generalDiag.json.diagnosis.hasTooth === false, 'general (non-tooth) diagnosis allowed');

  section('TREATMENT PLAN: CREATE + STATUS FLOW');
  const plan1 = await call('POST', '/api/treatment-plans', {
    token: d,
    body: {
      patientId,
      consultationId,
      visitId,
      name: 'Restore Tooth 16',
      items: [
        { procedure: 'Root Canal Treatment', toothNumber: 16, diagnosisId: diagId, priority: 'high', estimatedCost: 5000, status: 'planned' },
        { procedure: 'Prefabricated Crown', toothNumber: 16, priority: 'medium', estimatedCost: 6000, status: 'planned' },
      ],
    },
  });
  check(plan1.status === 201, `plan created (got ${plan1.status})`);
  const plan1Id = plan1.json.plan.id;
  check(plan1.json.plan.planNumber.startsWith('PL-'), 'plan number assigned (PL-...)');
  check(plan1.json.plan.status === 'draft', 'plan starts as draft');
  check(plan1.json.plan.itemCount === 2, 'plan has 2 items');
  check(plan1.json.plan.estimatedTotal === 11000, `estimated total = 11000 (got ${plan1.json.plan.estimatedTotal})`);

  let upd = await call('PATCH', `/api/treatment-plans/${plan1Id}`, { token: d, body: { status: 'proposed' } });
  check(upd.status === 200 && upd.json.plan.status === 'proposed', 'draft → proposed transition ok');
  check(!!upd.json.plan.proposedAt, 'proposedAt stamped');
  upd = await call('POST', `/api/treatment-plans/${plan1Id}/approve`, { token: d });
  check(upd.status === 200 && upd.json.plan.status === 'approved', 'approve transition ok');
  check(!!upd.json.plan.approvedAt && !!upd.json.plan.approvedBy, 'approvedAt + approvedBy stamped');

  const invalid = await call('PATCH', `/api/treatment-plans/${plan1Id}`, { token: d, body: { status: 'draft' } });
  check(invalid.status === 400, 'approved → draft rejected (400)');
  const terminalToDraft = await call('POST', '/api/treatment-plans', {
    token: d,
    body: { patientId, items: [{ procedure: 'Scaling', estimatedCost: 500 }] },
  });
  const tId = terminalToDraft.json.plan.id;
  await call('PATCH', `/api/treatment-plans/${tId}`, { token: d, body: { status: 'cancelled' } });
  const editTerminal = await call('PATCH', `/api/treatment-plans/${tId}`, { token: d, body: { name: 'Hacked' } });
  check(editTerminal.status === 409, 'cannot edit a cancelled plan (409)');

  section('PLAN ITEMS: ADD + UPDATE + REMOVE');
  const itemAdd = await call('POST', `/api/treatment-plans/${plan1Id}/items`, {
    token: d,
    body: { procedure: 'Core Build-up', toothNumber: 16, priority: 'low', estimatedCost: 2000 },
  });
  check(itemAdd.status === 201 && itemAdd.json.plan.itemCount === 3, 'item added (3 items)');
  check(itemAdd.json.plan.estimatedTotal === 13000, 'estimated total recalculated (13000)');
  const itemId = itemAdd.json.plan.items.find((i) => i.procedure === 'Core Build-up').id;

  const itemUpd = await call('PATCH', `/api/treatment-plans/${plan1Id}/items/${itemId}`, { token: d, body: { status: 'in-progress' } });
  check(itemUpd.status === 200 && itemUpd.json.plan.items.find((i) => i.id === itemId).status === 'in-progress', 'item progressed');

  const itemBadTrans = await call('PATCH', `/api/treatment-plans/${plan1Id}/items/${itemId}`, { token: d, body: { status: 'completed' } });
  check(itemBadTrans.status === 200, 'in-progress → completed allowed');

  const itemDel = await call('DELETE', `/api/treatment-plans/${plan1Id}/items/${itemId}`, { token: d });
  check(itemDel.status === 200 && itemDel.json.plan.itemCount === 2, 'item removed');

  section('INTEGRITY: TWO PLANS PRESERVED (teeth + plans independent)');
  const plan2 = await call('POST', '/api/treatment-plans', {
    token: d,
    body: { patientId, name: 'Replace Tooth 16 Crown', items: [{ procedure: 'Crown Replacement', toothNumber: 16, estimatedCost: 8000 }] },
  });
  const plan2Id = plan2.json.plan.id;
  await call('POST', `/api/treatment-plans/${plan2Id}/approve`, { token: d });

  const plansList = await call('GET', `/api/patients/${patientId}/treatment-plans`, { token: d });
  check(plansList.status === 200 && plansList.json.plans.length === 3, 'all plans preserved across patient (3 total)');
  const viaList = plansList.json.plans.map((pl) => pl.id);
  check(viaList.includes(plan1Id) && viaList.includes(plan2Id), 'both plan 1 and plan 2 still present (append-only, no overwrite)');
  const plan1Detail = await call('GET', `/api/treatment-plans/${plan1Id}`, { token: d });
  check(plan1Detail.json.plan.planNumber !== plan2.json.plan.planNumber, 'plans have distinct plan numbers');

  // Tooth chart must NOT be altered by planning alone (plans do not write tooth history).
  const tooth16 = await call('GET', `/api/patients/${patientId}/tooth-chart/16/history`, { token: d });
  if (tooth16.status === 200) {
    const treats = tooth16.json.tooth.treatments || [];
    check(treats.length === 0, 'treatment plans did not create tooth-history records (plans stay in the plan module)');
  }

  section('DECLINE');
  const plan3 = await call('POST', '/api/treatment-plans', {
    token: d,
    body: { patientId, name: 'Declined Probe', items: [{ procedure: 'Surgical Extraction', toothNumber: 38, estimatedCost: 3000 }] },
  });
  const decl = await call('POST', `/api/treatment-plans/${plan3.json.plan.id}/decline`, { token: d, body: { reason: 'Patient declined surgery' } });
  check(decl.status === 200 && decl.json.plan.status === 'declined', 'plan declined with reason');
  check(decl.json.plan.declineReason === 'Patient declined surgery', 'decline reason persisted');
  check(!!decl.json.plan.declinedAt, 'declinedAt timestamp set');

  section('VALIDATION');
  const badToothDiag = await call('POST', '/api/diagnoses', { token: d, body: { patientId, name: 'X', toothNumber: 78 } });
  check(badToothDiag.status === 400, 'invalid tooth on diagnosis rejected (400)');
  const badToothItem = await call('POST', `/api/treatment-plans/${plan1Id}/items`, { token: d, body: { procedure: 'Y', toothNumber: 19 } });
  check(badToothItem.status === 400, 'invalid tooth on plan item rejected (400)');
  const noNameDiag = await call('POST', '/api/diagnoses', { token: d, body: { patientId } });
  check(noNameDiag.status === 400, 'diagnosis without name rejected (400)');
  const noProcItem = await call('POST', `/api/treatment-plans/${plan1Id}/items`, { token: d, body: {} });
  check(noProcItem.status === 400, 'plan item without procedure rejected (400)');
  const crossDiag = await call('POST', '/api/treatment-plans', {
    token: d,
    body: { patientId, items: [{ procedure: 'Z', toothNumber: 16, diagnosisId: '507f1f77bcf86cd799439011' }] },
  });
  check(crossDiag.status === 400, 'foreign diagnosis reference rejected');
  const missingPatient = await call('GET', `/api/patients/${patientId}/treatment-plans`, { token: d });
  const badPatient = await call('GET', `/api/patients/507f1f77bcf86cd799439011/diagnoses`, { token: d });
  check(badPatient.status === 404, 'unknown patient diagnoses rejected (404)');

  section('RBAC / ACCESS');
  const noToken = await call('GET', `/api/consultations/${consultationId}/diagnoses`);
  check(noToken.status === 401, 'unauthenticated rejected (401)');
  const phRead = await call('GET', `/api/consultations/${consultationId}/diagnoses`, { token: p });
  check(phRead.status === 403, 'pharmacy cannot view clinical diagnoses (403)');
  const phWrite = await call('POST', '/api/diagnoses', { token: p, body: { patientId, name: 'X' } });
  check(phWrite.status === 403, 'pharmacy cannot create diagnosis (403)');
  const recRead = await call('GET', `/api/patients/${patientId}/treatment-plans`, { token: r });
  check(recRead.status === 200, 'receptionist can view plans (read-only)');
  const recWrite = await call('POST', '/api/treatment-plans', { token: r, body: { patientId, name: 'X' } });
  check(recWrite.status === 403, 'receptionist cannot create plan (403)');
  const admPlan = await call('POST', '/api/treatment-plans', { token: a, body: { patientId, name: 'Admin Plan', items: [{ procedure: 'Scaling', estimatedCost: 800 }] } });
  await call('PATCH', `/api/treatment-plans/${admPlan.json.plan.id}`, { token: a, body: { status: 'proposed' } });
  const admApprove = await call('POST', `/api/treatment-plans/${admPlan.json.plan.id}/approve`, { token: a });
  check(admApprove.status === 200 && admApprove.json.plan.status === 'approved', 'admin can approve plan (200)');

  section('AUDIT');
  const { AuditLog } = require('../models/AuditLog');
  const diagLogs = await AuditLog.find({ entity: 'diagnosis' });
  check(diagLogs.some((l) => l.action === 'create' && /Dental Caries/.test(l.description)), 'audit: diagnosis created');
  const planLogs = await AuditLog.find({ entity: 'treatment-plan' });
  check(planLogs.some((l) => l.action === 'create'), 'audit: plan created');
  check(planLogs.some((l) => l.action === 'approve'), 'audit: plan approved');
  check(planLogs.some((l) => l.action === 'decline'), 'audit: plan declined');

  await server.close();
  await mongod.stop();
  console.log(`\n${failures === 0 ? 'ALL DIAGNOSIS TESTS PASSED' : `${failures} TEST(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});