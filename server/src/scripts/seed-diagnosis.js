/* Development-only seed: demo diagnosis + treatment plan data.
   Run with: npm run seed:diagnosis
   Uses the shared "Test Patient" (phone marker +91-0000TOOTH0) from seed:tooth,
   creating an OP visit, diagnoses and a treatment plan with items.
   Refuses to run in production. */
const { connectDB } = require('../config/db');
const { createSeedUsers } = require('../utils/seed');
const { User } = require('../models/User');
const Patient = require('../models/Patient');
const consultationService = require('../services/consultation.service');
const diagnosisService = require('../services/diagnosis.service');
const treatmentPlanService = require('../services/treatmentPlan.service');

async function findOrCreateTestPatient() {
  const marker = '+91-0000TOOTH0';
  let patient = await Patient.findOne({ phone: marker });
  if (patient) return patient;
  const { nextPatientId } = require('../models/Counter');
  const patientId = await nextPatientId();
  patient = await Patient.create({
    patientId,
    firstName: 'Test',
    lastName: 'Patient',
    gender: 'male',
    dob: '1978-09-23',
    phone: marker,
    address: '12 Demo Colony',
    city: 'Delhi',
  });
  return patient;
}

async function run() {
  const ok = await connectDB();
  if (!ok) {
    console.error('Seed aborted: could not connect to MongoDB.');
    process.exit(1);
  }

  let doctor = await User.findOne({ role: 'doctor' });
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

  // OP visit
  const consultation = await consultationService.createConsultation({ patientId: String(pid), visitDate: new Date('2025-08-06') }, doc);
  const consultationId = consultation.id;
  const visitId = consultation.visit || null;

  // Diagnosis tied to tooth 16 with a plan
  const diag = await diagnosisService.create(
    {
      patientId: String(pid),
      consultationId,
      visitId,
      name: 'Deep Dental Caries',
      category: 'dental',
      toothNumber: 16,
      findings: 'Extensive decay involving pulp — RCT indicated',
      status: 'active',
    },
    doc,
  );

  const generalDiag = await diagnosisService.create(
    {
      patientId: String(pid),
      consultationId,
      visitId,
      name: 'Gingivitis',
      category: 'oral',
      findings: 'Generalised mild gingival inflammation',
      status: 'active',
    },
    doc,
  );

  // Plan 1 (approved) — restore tooth 16
  const plan1 = await treatmentPlanService.create(
    {
      patientId: String(pid),
      consultationId,
      visitId,
      name: 'Restore Tooth 16',
      items: [
        { procedure: 'Root Canal Treatment', toothNumber: 16, diagnosisId: diag.id, priority: 'high', estimatedCost: 5000 },
        { procedure: 'Prefabricated Crown', toothNumber: 16, priority: 'medium', estimatedCost: 6000 },
      ],
    },
    doc,
  );
  await treatmentPlanService.approve(plan1.id, doc);

  // Plan 2 (append-only, proposed) — separate proposal to keep history visible
  const plan2 = await treatmentPlanService.create(
    {
      patientId: String(pid),
      consultationId,
      visitId,
      name: 'Gingivitis Management',
      items: [
        { procedure: 'Scaling & Polishing', priority: 'medium', estimatedCost: 800 },
      ],
    },
    doc,
  );
  await treatmentPlanService.update(plan2.id, { status: 'proposed' }, doc);

  console.log('Diagnosis + treatment plan demo data seeded for:');
  console.log(`  Patient: ${patient.patientId} (${patient.fullName})`);
  console.log(`  Consultation: ${consultationId} · Visit: ${visitId}`);
  console.log(`  Diagnosis: ${diag.name} (Tooth 16) + ${generalDiag.name}`);
  console.log(`  Plan: ${plan1.planNumber} "${plan1.name}" approved — 2 items`);
  console.log(`  Plan: ${plan2.planNumber} "${plan2.name}" proposed — 1 item`);
  console.log('Open: Consultations → open the draft consultation → Diagnosis / Treatment Plan');
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