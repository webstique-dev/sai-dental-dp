/* Development-only seed: demo prescription + investigation data.
   Run with: npm run seed:rx
   Uses the shared "Test Patient" (phone marker +91-0000TOOTH0) from seed:tooth.
   Creates an OP visit, a draft+issued prescription, and an OPG investigation
   with a result (history preserved).
   Refuses to run in production. */
const { connectDB } = require('../config/db');
const { createSeedUsers } = require('../utils/seed');
const { User } = require('../models/User');
const Patient = require('../models/Patient');
const consultationService = require('../services/consultation.service');
const prescriptionService = require('../services/prescription.service');
const investigationService = require('../services/investigation.service');

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

  // Draft prescription (editable)
  const draftRx = await prescriptionService.create(
    {
      patientId: String(pid),
      consultationId,
      visitId,
      rxDate: new Date('2025-08-06'),
      items: [
        { medicine: 'Amoxicillin', dosage: '500', unit: 'mg', frequency: 'three-times-daily', duration: 5, durationUnit: 'day', route: 'oral', quantity: 15, foodInstruction: 'after-food', instructions: 'After food' },
        { medicine: 'Ibuprofen', dosage: '400', unit: 'mg', frequency: 'twice-daily', duration: 3, durationUnit: 'day', route: 'oral', quantity: 6, foodInstruction: 'after-food', instructions: 'After food' },
      ],
      notes: 'Follow up after 5 days.',
    },
    doc,
  );

  // Issued prescription (locked)
  const issuedRx = await prescriptionService.create(
    {
      patientId: String(pid),
      consultationId,
      visitId,
      rxDate: new Date('2025-08-06'),
      items: [
        { medicine: 'Chlorhexidine Mouthwash', dosage: '0.12', unit: '%', frequency: 'twice-daily', duration: 7, durationUnit: 'day', route: 'topical', quantity: 1, foodInstruction: 'after-food', instructions: 'Rinse after brushing for 30 seconds' },
        { medicine: 'Paracetamol', dosage: '500', unit: 'mg', frequency: 'twice-daily', duration: 3, durationUnit: 'day', route: 'oral', quantity: 6, foodInstruction: 'after-food', instructions: 'If pain persists' },
      ],
      notes: 'Mouthwash: spit out, do not swallow.',
    },
    doc,
  );
  await prescriptionService.issue(issuedRx.id, doc);

  // Investigation: OPG requested, then result added (append-only history)
  const inv = await investigationService.create(
    {
      patientId: String(pid),
      consultationId,
      visitId,
      type: 'opg',
      reason: 'Pre-surgical assessment of impacted tooth 38',
      indication: 'Assess relation to inferior alveolar canal before extraction',
      priority: 'routine',
      notes: 'Patient reports mild swelling on lower left.',
    },
    doc,
  );
  await investigationService.addResult(
    inv.id,
    { findings: 'Impacted tooth 38 with radiolucency at crown level. Canal proximity: close but no direct involvement.', interpretation: 'Extraction with careful sectioning advised. Cone-beam CT recommended if proximity needs reassessment.' },
    doc,
  );

  console.log('Prescription + investigation demo data seeded for:');
  console.log(`  Patient: ${patient.patientId} (${patient.fullName})`);
  console.log(`  Consultation: ${consultationId} · Visit: ${visitId}`);
  console.log(`  Prescription (draft):  ${draftRx.prescriptionNumber} — 2 medicines`);
  console.log(`  Prescription (issued): ${issuedRx.prescriptionNumber} — 2 medicines (locked)`);
  console.log(`  Investigation: ${inv.investigationNumber} OPG — result available`);
  console.log('Open: Consultations → open the draft consultation → Prescription / Investigations');
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