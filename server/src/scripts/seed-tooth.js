/* Development-only seed: demo tooth chart data.
   Run with: npm run seed:tooth
   Creates a "Test Patient" with realistic tooth history for Teeth 16, 26 and 36.
   Refuses to run in production. */
const { connectDB } = require('../config/db');
const { createSeedUsers } = require('../utils/seed');
const { User } = require('../models/User');
const Patient = require('../models/Patient');
const { nextPatientId } = require('../models/Counter');
const toothChartService = require('../services/toothChart.service');

async function findOrCreateTestPatient() {
  const marker = '+91-0000TOOTH0';
  const existing = await Patient.findOne({ phone: marker });
  if (existing) return existing;
  const patientId = await nextPatientId();
  return Patient.create({
    patientId,
    firstName: 'Test',
    lastName: 'Patient',
    gender: 'male',
    dob: '1978-09-23',
    phone: marker,
    address: '12 Demo Colony',
    city: 'Delhi',
  });
}

async function run() {
  const ok = await connectDB();
  if (!ok) {
    console.error('Seed aborted: could not connect to MongoDB.');
    process.exit(1);
  }

  const doctor = await User.findOne({ role: 'doctor' });
  if (!doctor) {
    await createSeedUsers();
  }
  const doc = await User.findOne({ role: 'doctor' });
  if (!doc) {
    console.error('Seed aborted: no doctor user available.');
    process.exit(1);
  }

  const patient = await findOrCreateTestPatient();
  const pid = patient._id;

  // Tooth 16 — Caries → RCT → Crown (persistent history demonstration)
  await toothChartService.addFinding(pid, 16, {
    condition: 'caries',
    findings: 'Deep carious lesion on occlusal surface of tooth 16',
    date: '2025-01-10',
  }, doc);
  await toothChartService.addTreatment(pid, 16, {
    procedure: 'Root Canal Treatment',
    status: 'completed',
    charges: 5000,
    notes: 'Root canal treatment started',
    date: '2025-01-18',
  }, doc);
  await toothChartService.addTreatment(pid, 16, {
    procedure: 'Root Canal Treatment',
    status: 'completed',
    charges: 3000,
    notes: 'RCT completed',
    date: '2025-01-25',
  }, doc);
  await toothChartService.addTreatment(pid, 16, {
    procedure: 'Crown',
    status: 'completed',
    charges: 6000,
    notes: 'Crown placed on tooth 16',
    date: '2025-02-05',
  }, doc);

  // Tooth 26 — Filling
  await toothChartService.addTreatment(pid, 26, {
    procedure: 'Composite Filling',
    status: 'completed',
    charges: 1500,
    date: '2025-03-01',
  }, doc);

  // Tooth 36 — Caries
  await toothChartService.addFinding(pid, 36, {
    condition: 'caries',
    findings: 'Occlusal caries tooth 36',
    date: '2025-04-02',
  }, doc);

  console.log('Tooth chart demo data seeded for:');
  console.log(`  Patient: ${patient.patientId} (${patient.fullName})`);
  console.log('  Tooth 16: Caries → RCT → Crown (history preserved)');
  console.log('  Tooth 26: Composite Filling');
  console.log('  Tooth 36: Caries');
  console.log('Open: Consultations → Tooth Chart → select Tooth 16');
  process.exit(0);
}

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed demo clinical data in production.');
  process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});