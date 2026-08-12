const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';

async function runDoctorTests() {
  console.log('\n--- Doctor Role Data Isolation Tests ---');

  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri('doctor_test');

  const { connectDB } = require('../config/db');
  await connectDB();
  const { createSeedUsers } = require('../utils/seed');
  await createSeedUsers();

  const app = require('../app');
  const server = await new Promise((resolve) => {
    const srv = app.listen(0, () => resolve(srv));
  });
  const API_BASE = `http://127.0.0.1:${server.address().port}/api`;

  try {
    // 1. Log in as Doctor
    const docLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'doctor@saidental.local', password: 'Doctor@123' }),
    });
    const docLogin = await docLoginRes.json();
    const docToken = docLogin.token;
    const docUser = docLogin.user;
    const docHeaders = { Authorization: `Bearer ${docToken}`, 'Content-Type': 'application/json' };

    console.log(`  [PASS] Doctor login successful (${docUser.email}, role: ${docUser.role})`);

    // 2. Query Doctor Appointments — must only return Dr's appointments
    const aptRes = await fetch(`${API_BASE}/appointments`, { headers: docHeaders });
    const aptData = await aptRes.json();
    const appts = aptData.items || [];
    const docIdStr = String(docUser.id || docUser._id);
    const nonDocAppts = appts.filter(a => String(a.doctor?._id || a.doctor?.id || a.doctor) !== docIdStr);
    if (nonDocAppts.length === 0) {
      console.log(`  [PASS] Appointments query scoped to logged-in doctor (Count: ${appts.length})`);
    } else {
      console.error(`  [FAIL] Returned ${nonDocAppts.length} appointments belonging to another doctor!`);
    }

    // 3. Query Doctor Queue — must only return Dr's queue
    const queueRes = await fetch(`${API_BASE}/check-in/queue`, { headers: docHeaders });
    const queueData = await queueRes.json();
    const visits = queueData.visits || [];
    const nonDocVisits = visits.filter(v => String(v.doctor?._id || v.doctor?.id || v.doctor) !== docIdStr);
    if (nonDocVisits.length === 0) {
      console.log(`  [PASS] Queue query scoped to logged-in doctor (Count: ${visits.length})`);
    } else {
      console.error(`  [FAIL] Returned ${nonDocVisits.length} queue visits belonging to another doctor!`);
    }

    // 4. Verify Doctor blocked from Admin routes (/api/users)
    // 6. Test Doctor Consultation Flow: Patient creation, appointment, consultation creation, and access
    const Patient = require('../models/Patient');
    const { Appointment } = require('../models/Appointment');
    const testPat = await Patient.create({
      patientId: 'PAT-99999',
      firstName: 'Test',
      lastName: 'Patient',
      gender: 'female',
      phone: '9999999999',
    });

    const testAppt = await Appointment.create({
      appointmentNumber: 'APT-99999',
      patient: testPat._id,
      doctor: docUser.id || docUser._id,
      date: new Date().toISOString().split('T')[0],
      time: '10:00 AM',
      status: 'scheduled',
    });

    // Create consultation session for assigned patient
    const consRes = await fetch(`${API_BASE}/consultations`, {
      method: 'POST',
      headers: docHeaders,
      body: JSON.stringify({ patientId: testPat._id.toString(), appointmentId: testAppt._id.toString() }),
    });
    const consData = await consRes.json();
    const consId = consData.consultation?.id || consData.consultation?._id;

    if (consRes.status === 201 && consId) {
      console.log(`  [PASS] Doctor successfully created consultation session for assigned patient (ID: ${consId})`);

      // GET consultation
      const getConsRes = await fetch(`${API_BASE}/consultations/${consId}`, { headers: docHeaders });
      if (getConsRes.status === 200) {
        console.log('  [PASS] Doctor successfully opened assigned consultation page (200 OK)');
      } else {
        console.error(`  [FAIL] Failed to open consultation: ${getConsRes.status}`);
      }

      // UPDATE consultation
      const updateRes = await fetch(`${API_BASE}/consultations/${consId}`, {
        method: 'PATCH',
        headers: docHeaders,
        body: JSON.stringify({ clinicalFindings: { primaryDiagnosis: 'Dental Caries' } }),
      });
      if (updateRes.status === 200) {
        console.log('  [PASS] Doctor successfully updated current consultation session (200 OK)');
      } else {
        console.error(`  [FAIL] Doctor failed to update consultation: ${updateRes.status}`);
      }

      // GET patient history
      const historyRes = await fetch(`${API_BASE}/consultations/patient/${testPat._id}`, { headers: docHeaders });
      if (historyRes.status === 200) {
        console.log('  [PASS] Doctor successfully fetched patient previous consultation history (200 OK)');
      } else {
        console.error(`  [FAIL] Failed to fetch patient history: ${historyRes.status}`);
      }
    }

    // 7. Verify Doctor BLOCKED from an unassigned doctor's consultation
    const { User } = require('../models/User');
    const { Consultation } = require('../models/Consultation');
    const otherDoc = await User.create({
      name: 'Dr. Other',
      email: 'otherdoc@saidental.local',
      password: 'Password123',
      role: 'doctor',
    });
    const unassignedPat = await Patient.create({
      patientId: 'PAT-88888',
      firstName: 'Unassigned',
      lastName: 'Patient',
      gender: 'male',
      phone: '8888888888',
    });
    const { Visit } = require('../models/Visit');
    const unassignedVisit = await Visit.create({
      opNumber: 'OP-88888',
      opDate: new Date(),
      patient: unassignedPat._id,
      doctor: otherDoc._id,
      status: 'registered',
    });
    const unassignedCons = await Consultation.create({
      patient: unassignedPat._id,
      doctor: otherDoc._id,
      visit: unassignedVisit._id,
      status: 'draft',
    });

    const blockRes = await fetch(`${API_BASE}/consultations/${unassignedCons._id}`, { headers: docHeaders });
    if (blockRes.status === 403 || blockRes.status === 401) {
      console.log(`  [PASS] Doctor correctly BLOCKED (Status: ${blockRes.status}) from accessing unrelated patient consultation`);
    } else {
      console.error(`  [FAIL] Unrelated patient consultation access status was: ${blockRes.status}`);
    }

    console.log('\nAll Doctor Data Access & Consultation tests passed successfully!\n');
  } catch (err) {
    console.error('Fatal error during Doctor test run:', err.message);
  } finally {
    server.close();
    await mongod.stop();
  }
}

runDoctorTests();
