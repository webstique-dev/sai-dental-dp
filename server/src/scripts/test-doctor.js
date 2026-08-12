/* Integration test: Doctor Module (Consultation, Tooth Charting, Diagnosis, Treatment Plan, Prescriptions, Investigations & Attachments, Treatment Execution, Follow-ups, EMR)
   Run with: node src/scripts/test-doctor.js */
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';

async function main() {
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

  // 1. Auth Login (Doctor & Receptionist)
  section('1. Authentication');
  const docLogin = await call('POST', '/api/auth/login', {
    body: { email: 'doctor@saidental.local', password: 'Doctor@123' },
  });
  check(docLogin.status === 200 && docLogin.json.accessToken, 'Doctor login successful');
  const docToken = docLogin.json.accessToken;
  const docId = docLogin.json.user._id || docLogin.json.user.id;

  const recLogin = await call('POST', '/api/auth/login', {
    body: { email: 'reception@saidental.local', password: 'Reception@123' },
  });
  const recToken = recLogin.json.accessToken;

  // 2. Patient Registration & Appointment Check-in with Chief Complaint
  section('2. Patient Registration & Appointment Check-in');
  const patientRes = await call('POST', '/api/patients', {
    token: recToken,
    body: {
      firstName: 'Karthik',
      lastName: 'Subramanian',
      phone: '9840012345',
      gender: 'male',
      dob: '1992-04-10',
    },
  });
  check(patientRes.status === 201, 'Patient registered');
  const patientId = patientRes.json.patient._id;

  const aptRes = await call('POST', '/api/appointments', {
    token: recToken,
    body: {
      patient: patientId,
      doctor: docId,
      date: new Date().toISOString(),
      time: '11:00 AM',
      type: 'Emergency Consultation',
      reason: 'Severe pain in lower left molar',
      source: 'phone',
    },
  });
  check(aptRes.status === 201, 'Appointment booked with Chief Complaint');
  const aptId = aptRes.json.appointment._id;

  const checkInRes = await call('POST', '/api/check-in/appointment', {
    token: recToken,
    body: { appointmentId: aptId },
  });
  check(checkInRes.status === 200 && checkInRes.json.token, 'Patient checked in');

  // 3. Clinical Consultation & Chief Complaint Verification
  section('3. Consultation Creation & History');
  const consultRes = await call('POST', '/api/consultations', {
    token: docToken,
    body: {
      patientId,
      appointmentId: aptId,
    },
  });
  check(consultRes.status === 201 && consultRes.json.consultation.appointment, 'Consultation created');
  const consultId = consultRes.json.consultation.id || consultRes.json.consultation._id;
  check(
    consultRes.json.consultation.appointment.reason === 'Severe pain in lower left molar',
    'Populated Chief Complaint matches check-in appointment reason',
  );

  // 4. Tooth Charting (Permanent #36 & Primary #55)
  section('4. Tooth Charting (Permanent & Primary)');
  const tooth36Res = await call('POST', `/api/patients/${patientId}/tooth-chart/36/findings`, {
    token: docToken,
    body: {
      condition: 'caries',
      findings: 'Deep occlusal caries involving pulp',
      consultationId: consultId,
    },
  });
  check(tooth36Res.status === 201 && tooth36Res.json.tooth.currentStatus === 'caries', 'Permanent Tooth #36 charted with Caries');

  const tooth55Res = await call('POST', `/api/patients/${patientId}/tooth-chart/55/findings`, {
    token: docToken,
    body: {
      condition: 'healthy',
      findings: 'Primary upper right molar healthy',
      consultationId: consultId,
    },
  });
  check(tooth55Res.status === 201 && tooth55Res.json.tooth.toothNumber === 55, 'Primary Tooth #55 charted successfully');

  // 5. Diagnosis & Treatment Plan
  section('5. Diagnosis & Treatment Plan');
  const diagRes = await call('POST', '/api/diagnoses', {
    token: docToken,
    body: {
      patientId,
      consultationId: consultId,
      name: 'Irreversible Pulpitis',
      category: 'dental',
      hasTooth: true,
      toothNumber: 36,
      findings: 'Symptomatic pulpitis lower left molar',
    },
  });
  check(diagRes.status === 201, 'Diagnosis recorded tied to Tooth #36');
  const diagId = diagRes.json.diagnosis ? (diagRes.json.diagnosis.id || diagRes.json.diagnosis._id) : null;

  const planRes = await call('POST', '/api/treatment-plans', {
    token: docToken,
    body: {
      patientId,
      consultationId: consultId,
      name: 'Root Canal Treatment & Crown Plan',
      items: [
        {
          procedure: 'Root Canal Treatment',
          hasTooth: true,
          toothNumber: 36,
          estimatedCost: 6500,
          priority: 'urgent',
          diagnosis: diagId,
        },
      ],
    },
  });
  check(planRes.status === 201 && planRes.json.plan.items.length === 1, 'Treatment Plan created with estimated cost');

  // 6. Prescriptions & Investigations with X-Ray Attachment
  section('6. Prescriptions & Investigations with Attachments');
  const rxRes = await call('POST', '/api/prescriptions', {
    token: docToken,
    body: {
      patientId,
      consultationId: consultId,
      diagnosisId: diagId,
      items: [
        {
          medicine: 'Amoxicillin',
          dosage: '500',
          unit: 'mg',
          frequency: 'three-times-daily',
          duration: 5,
          foodInstruction: 'after-food',
        },
      ],
    },
  });
  check(rxRes.status === 201, 'Prescription created');
  const rxId = rxRes.json.prescription.id || rxRes.json.prescription._id;

  const rxIssueRes = await call('POST', `/api/prescriptions/${rxId}/issue`, { token: docToken });
  check(rxIssueRes.status === 200 && rxIssueRes.json.prescription.status === 'issued', 'Prescription issued to pharmacy');

  const invRes = await call('POST', '/api/investigations', {
    token: docToken,
    body: {
      patientId,
      consultationId: consultId,
      type: 'rvg-iopa',
      reason: 'Rule out periapical radiolucency #36',
    },
  });
  check(invRes.status === 201, 'IOPA Investigation requested');
  const invId = invRes.json.investigation.id || invRes.json.investigation._id;

  const attRes = await call('POST', `/api/investigations/${invId}/attachments`, {
    token: docToken,
    body: {
      name: 'IOPA X-Ray #36',
      url: 'https://saidental.local/attachments/iopa-36.jpg',
      mimeType: 'image/jpeg',
    },
  });
  check(attRes.status === 201 && attRes.json.investigation.attachments.length === 1, 'X-Ray image attached to investigation');

  // 7. Treatment Execution & Follow-up
  section('7. Treatment Execution & Follow-up');
  const execRes = await call('POST', '/api/treatment-records', {
    token: docToken,
    body: {
      patientId,
      consultationId: consultId,
      hasTooth: true,
      toothNumber: 36,
      procedure: 'Root Canal Access & Biomechanical Preparation',
      outcome: 'successful',
      notes: 'Pulp extirpated under local anesthesia.',
      status: 'completed',
    },
  });
  check(execRes.status === 201 && execRes.json.record && execRes.json.record.status === 'completed', 'Treatment execution logged with clinical notes');

  const fuRes = await call('POST', '/api/follow-ups', {
    token: docToken,
    body: {
      patientId,
      consultationId: consultId,
      followUpDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      reason: 'Obturation & Permanent Restoration #36',
    },
  });
  check(fuRes.status === 201, 'Follow-up recommended for receptionist scheduling');

  // 8. EMR History Retrieval
  section('8. Central Patient EMR History');
  const emrConsults = await call('GET', `/api/patients/${patientId}/consultations`, { token: docToken });
  const consultList = emrConsults.json.items || emrConsults.json.consultations || [];
  check(emrConsults.status === 200 && consultList.length >= 1, 'Patient central consultations retrieved');

  const emrDiags = await call('GET', `/api/patients/${patientId}/diagnoses`, { token: docToken });
  const diagList = emrDiags.json.diagnoses || [];
  check(emrDiags.status === 200 && diagList.length >= 1, 'Patient central diagnoses retrieved');

  server.close();
  await mongod.stop();

  if (failures > 0) {
    console.error(`\nTest suite finished with ${failures} failure(s).`);
    process.exit(1);
  } else {
    console.log('\nAll Doctor module integration tests passed successfully!');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error during doctor test run:', err);
  process.exit(1);
});
