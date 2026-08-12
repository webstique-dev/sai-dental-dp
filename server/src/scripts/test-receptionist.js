/* Integration test: Receptionist Module (Patient Duplicate Check, Appointments, Check-in Queue, Reports)
   Run with: npm run test:receptionist */
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri('receptionist_test');

  const { connectDB } = require('../config/db');
  await connectDB();
  const { createSeedUsers } = require('../utils/seed');
  const seeded = await createSeedUsers();

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

  // 1. Auth Login (Receptionist & Doctor)
  section('1. Authentication');
  const loginRes = await call('POST', '/api/auth/login', {
    body: { email: 'reception@saidental.local', password: 'Reception@123' },
  });
  check(loginRes.status === 200 && loginRes.json.accessToken, 'Receptionist login successful');
  const token = loginRes.json.accessToken;

  const docLogin = await call('POST', '/api/auth/login', {
    body: { email: 'doctor@saidental.local', password: 'Doctor@123' },
  });
  const docId = docLogin.json.user._id || docLogin.json.user.id;

  // 2. Patient Registration & Duplicate Detection
  section('2. Patient Registration & Duplicate Check');
  const p1Res = await call('POST', '/api/patients', {
    token,
    body: {
      firstName: 'Ramesh',
      lastName: 'Kumar',
      phone: '9876543210',
      gender: 'male',
      address: '123 Main St',
      city: 'Chennai',
    },
  });
  check(p1Res.status === 201 && p1Res.json.patient.patientId, 'Patient created (PAT-...)');
  const p1Id = p1Res.json.patient._id;

  const dupCheck1 = await call('GET', '/api/patients/check-duplicate?phone=9876543210', { token });
  check(dupCheck1.status === 200 && dupCheck1.json.isDuplicate === true, 'Duplicate check detected phone match');

  const dupCheck2 = await call('GET', '/api/patients/check-duplicate?firstName=Ramesh&lastName=Kumar', { token });
  check(dupCheck2.status === 200 && dupCheck2.json.isDuplicate === true, 'Duplicate check detected name match');

  const updateP1 = await call('PATCH', `/api/patients/${p1Id}`, {
    token,
    body: { city: 'Coimbatore', bloodGroup: 'O+' },
  });
  check(updateP1.status === 200 && updateP1.json.patient.city === 'Coimbatore', 'Patient details updated');

  // 3. Appointment Management
  section('3. Appointment Management');
  const apt1 = await call('POST', '/api/appointments', {
    token,
    body: {
      patient: p1Id,
      doctor: docId,
      date: new Date().toISOString(),
      time: '10:00 AM',
      type: 'Routine Checkup',
      reason: 'Teeth cleaning',
      source: 'phone',
    },
  });
  check(apt1.status === 201 && apt1.json.appointment.appointmentNumber, 'Appointment created (APT-...)');
  const apt1Id = apt1.json.appointment._id;

  const aptList = await call('GET', `/api/appointments?doctor=${docId}`, { token });
  check(aptList.status === 200 && aptList.json.items.length >= 1, 'Appointments listed by doctor');

  const updateApt = await call('PATCH', `/api/appointments/${apt1Id}`, {
    token,
    body: { time: '10:30 AM', notes: 'Patient requested time shift' },
  });
  check(updateApt.status === 200 && updateApt.json.appointment.time === '10:30 AM', 'Appointment updated');

  // 4. Check-in & Queue Management
  section('4. Check-in & Queue Management');
  const checkIn1 = await call('POST', '/api/check-in/appointment', {
    token,
    body: { appointmentId: apt1Id },
  });
  check(checkIn1.status === 200 && checkIn1.json.token.startsWith('T-'), 'Appointment check-in generated daily token');
  const token1 = checkIn1.json.token;
  const visit1Id = checkIn1.json.visit._id;

  // Create patient 2 for walk-in check-in
  const p2Res = await call('POST', '/api/patients', {
    token,
    body: { firstName: 'Sunita', lastName: 'Devi', phone: '9123456789', gender: 'female' },
  });
  const p2Id = p2Res.json.patient._id;

  const walkInCheckIn = await call('POST', '/api/check-in/walk-in', {
    token,
    body: {
      patientId: p2Id,
      doctorId: docId,
      reason: 'Acute toothache',
    },
  });
  check(walkInCheckIn.status === 201 && walkInCheckIn.json.token.startsWith('T-'), 'Walk-in check-in created appointment & visit with token');

  const queueList = await call('GET', '/api/check-in/queue', { token });
  check(queueList.status === 200 && queueList.json.visits.length === 2, 'Today queue lists 2 waiting patients');

  const updateQueue = await call('PATCH', `/api/check-in/queue/${visit1Id}/status`, {
    token,
    body: { status: 'in-progress' },
  });
  check(updateQueue.status === 200 && updateQueue.json.visit.status === 'in-progress', 'Queue status updated to in-progress');

  // 5. Basic Reports
  section('5. Receptionist Daily Summary Report');
  const reportRes = await call('GET', '/api/reports/receptionist-summary', { token });
  check(reportRes.status === 200 && reportRes.json.summary.footfall.total === 2, 'Report summarizes daily footfall correctly');
  check(reportRes.json.summary.footfall.walkIn === 1, 'Report counts walk-ins correctly');

  server.close();
  await mongod.stop();

  if (failures > 0) {
    console.error(`\nTest suite finished with ${failures} failure(s).`);
    process.exit(1);
  } else {
    console.log('\nAll Receptionist module integration tests passed successfully!');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
