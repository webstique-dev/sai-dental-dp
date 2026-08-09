/* Integration test: digital tooth chart + persistent tooth treatment history.
   Run with: npm run test:tooth */
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri('tooth_test');

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

  section('SETUP: PATIENT + TWO OP VISITS');
  const patientRes = await call('POST', '/api/patients', {
    token: d,
    body: { firstName: 'Ravi', lastName: 'Kumar', gender: 'male', phone: '+91-9988776655', dob: '1985-03-11' },
  });
  check(patientRes.status === 201, `patient registered (got ${patientRes.status})`);
  const patientId = patientRes.json.patient._id;

  const booking = async (visitDate) => {
    const c = await call('POST', '/api/consultations', { token: d, body: { patientId, visitDate } });
    check(c.status === 201, `consultation/OP visit created (${visitDate})`);
    return { consultationId: c.json.consultation.id, visitId: c.json.consultation.visit.id };
  };

  const first = await booking('2025-01-10');
  const second = await booking('2025-08-06');

  section('EMPTY CHART + DEFAULT TOOTH');
  const chart = await call('GET', `/api/patients/${patientId}/tooth-chart`, { token: d });
  check(chart.status === 200 && Array.isArray(chart.json.items), 'tooth chart loads');
  check(chart.json.total === 0, 'chart is empty before any activity (total 0)');
  const empty16 = await call('GET', `/api/patients/${patientId}/tooth-chart/16`, { token: d });
  check(empty16.status === 200 && empty16.json.tooth.currentStatus === 'healthy', 'untouched tooth defaults to healthy');

  section('TOOTH 16 — DATA INTEGRITY: Caries → RCT → Crown (history must persist)');
  const f1 = await call('POST', `/api/patients/${patientId}/tooth-chart/16/findings`, {
    token: d,
    body: { condition: 'caries', findings: 'Occlusal carious lesion on tooth 16', date: '2025-01-10', visitId: first.visitId, consultationId: first.consultationId },
  });
  check(f1.status === 201, `findings: Caries recorded (got ${f1.status})`);
  check(f1.json.tooth.currentStatus === 'caries', 'current status becomes Caries');

  const t2 = await call('POST', `/api/patients/${patientId}/tooth-chart/16/treatments`, {
    token: d,
    body: { procedure: 'Root Canal Treatment', status: 'completed', charges: 5000, date: '2025-01-18', visitId: first.visitId, consultationId: first.consultationId },
  });
  check(t2.status === 201, 'treatment: RCT added (got 201)');
  check(t2.json.tooth.currentStatus === 'rct', 'current status becomes RCT');

  const t3 = await call('POST', `/api/patients/${patientId}/tooth-chart/16/treatments`, {
    token: d,
    body: { procedure: 'Crown', status: 'completed', charges: 6000, date: '2025-02-05', visitId: first.visitId, consultationId: first.consultationId },
  });
  check(t3.status === 201, 'treatment: Crown added (got 201)');
  check(t3.json.tooth.currentStatus === 'crown', 'current status becomes Crown');

  const hist = await call('GET', `/api/patients/${patientId}/tooth-chart/16/history`, { token: d });
  check(hist.status === 200, 'tooth 16 history loads');
  const timeline = hist.json.tooth.timeline || [];
  const titles = timeline.map((e) => `${e.type}:${e.title}`);
  const hasCaries = timeline.some((e) => e.type === 'finding' && e.title === 'caries');
  const hasRCT = timeline.some((e) => e.type === 'treatment' && /root canal/i.test(e.title));
  const hasCrown = timeline.some((e) => e.type === 'treatment' && /crown/i.test(e.title));
  check(hasCaries && hasRCT && hasCrown, 'history retains Caries + RCT + Crown (NOT just Crown)');
  check(timeline[0].date <= timeline[timeline.length - 1].date, 'history is in chronological order (oldest → newest)');
  check(hist.json.tooth.currentStatus === 'crown', 'current status derived to Crown while past states preserved');

  section('PERSISTENCE ACROSS OP VISITS');
  const afterSecondVisit = await call('GET', `/api/patients/${patientId}/tooth-chart/16/history`, { token: d });
  const t16 = afterSecondVisit.json.tooth;
  check(
    t16.findings.some((f) => f.condition === 'caries') &&
    t16.treatments.some((t) => t.status === 'completed'),
    'tooth 16 full history available in later OP visit',
  );
  check(t16.currentStatus === 'crown', 'tooth 16 current status persists across visits');

  section('INDEPENDENT TOOTH HISTORIES (26, 36)');
  await call('POST', `/api/patients/${patientId}/tooth-chart/26/treatments`, {
    token: d,
    body: { procedure: 'Composite Filling', status: 'completed', charges: 1500, date: '2025-03-01' },
  });
  await call('POST', `/api/patients/${patientId}/tooth-chart/36/findings`, {
    token: d,
    body: { condition: 'caries', findings: 'Distal caries tooth 36', date: '2025-04-02' },
  });
  const ch26 = await call('GET', `/api/patients/${patientId}/tooth-chart/26/history`, { token: d });
  const ch36 = await call('GET', `/api/patients/${patientId}/tooth-chart/36/history`, { token: d });
  check(ch26.json.tooth.currentStatus === 'filling', 'tooth 26 has its own history (Filling)');
  check(ch26.json.tooth.timeline.every((e) => e.title !== 'Crown'), 'tooth 26 history does not leak tooth 16 data');
  check(ch36.json.tooth.currentStatus === 'caries', 'tooth 36 has its own history (Caries)');
  const chart2 = await call('GET', `/api/patients/${patientId}/tooth-chart`, { token: d });
  const nums = chart2.json.items.map((t) => t.toothNumber).sort();
  check(JSON.stringify(nums) === JSON.stringify([16, 26, 36]), 'chart lists the 3 recorded teeth');

  section('UPDATE TOOTH + DEFAULT STATUS');
  const upd = await call('PATCH', `/api/patients/${patientId}/tooth-chart/36`, {
    token: d,
    body: { notes: 'Monitor closely', currentStatus: 'extraction-required' },
  });
  check(upd.status === 200 && upd.json.tooth.currentStatus === 'extraction-required', 'tooth notes/status updated');
  check(upd.json.tooth.notes === 'Monitor closely', 'tooth notes persisted');

  section('VALIDATION');
  const badTooth = await call('GET', `/api/patients/${patientId}/tooth-chart/19`, { token: d });
  check(badTooth.status === 400, 'invalid FDI tooth number 19 rejected (400)');
  const badTooth2 = await call('POST', `/api/patients/${patientId}/tooth-chart/78/findings`, {
    token: d,
    body: { condition: 'caries' },
  });
  check(badTooth2.status === 400, 'arbitrary tooth number 78 rejected (400)');
  const badCond = await call('POST', `/api/patients/${patientId}/tooth-chart/26/findings`, {
    token: d,
    body: { condition: 'sparkly' },
  });
  check(badCond.status === 400, 'invalid condition rejected (400)');
  const badVisit = await call('POST', `/api/patients/${patientId}/tooth-chart/26/treatments`, {
    token: d,
    body: { procedure: 'Filling', status: 'completed', visitId: '507f1f77bcf86cd799439011' },
  });
  check(badVisit.status === 404, 'unknown OP visit rejected (404)');
  const missingPatient = await call('GET', `/api/patients/507f1f77bcf86cd799439011/tooth-chart`, { token: d });
  check(missingPatient.status === 404, 'unknown patient rejected (404)');

  section('RBAC / ACCESS');
  const noToken = await call('GET', `/api/patients/${patientId}/tooth-chart`);
  check(noToken.status === 401, 'unauthenticated rejected (401)');
  const phRead = await call('GET', `/api/patients/${patientId}/tooth-chart`, { token: p });
  check(phRead.status === 403, 'pharmacy cannot even view chart (403)');
  const phEdit = await call('POST', `/api/patients/${patientId}/tooth-chart/16/findings`, { token: p, body: { condition: 'caries' } });
  check(phEdit.status === 403, 'pharmacy cannot add finding (403)');
  const recRead = await call('GET', `/api/patients/${patientId}/tooth-chart/26/history`, { token: r });
  check(recRead.status === 200, 'receptionist can view history (read-only)');
  const recEdit = await call('POST', `/api/patients/${patientId}/tooth-chart/16/findings`, { token: r, body: { condition: 'caries' } });
  check(recEdit.status === 403, 'receptionist cannot edit (403)');
  const admEdit = await call('POST', `/api/patients/${patientId}/tooth-chart/16/findings`, { token: a, body: { condition: 'other', findings: 'admin note' } });
  check(admEdit.status === 201, 'admin can edit (201)');

  section('AUDIT');
  const { AuditLog } = require('../models/AuditLog');
  const logs = await AuditLog.find({ entity: 'tooth-chart' });
  const desc = logs.map((l) => l.description).join('|');
  check(logs.some((l) => l.action === 'create' && /Tooth 16 finding/.test(l.description)), 'audit: tooth finding created');
  check(logs.some((l) => l.action === 'create' && /Tooth 16 treatment/.test(l.description)), 'audit: tooth treatment created');
  check(logs.some((l) => l.action === 'update' && /Tooth 36 updated/.test(l.description)), 'audit: tooth status updated');

  await server.close();
  await mongod.stop();
  console.log(`\n${failures === 0 ? 'ALL TOOTH TESTS PASSED' : `${failures} TEST(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
