const { connectDB } = require('../config/db');
const { createSeedUsers, createSeedServices, createSeedMedicines, createSeedDummyRecords } = require('../utils/seed');

async function run() {
  const ok = await connectDB();
  if (!ok) {
    console.error('Seed aborted: could not connect to MongoDB.');
    process.exit(1);
  }
  const created = await createSeedUsers();
  const svcCreated = await createSeedServices();
  const medCreated = await createSeedMedicines();
  await createSeedDummyRecords();
  console.log('Seeded users (roles):', created.length ? created.join(', ') : 'all already exist');
  console.log('Seeded services:', svcCreated.length ? svcCreated.join(', ') : 'all already exist');
  console.log('Seeded medicines:', medCreated.length ? `${medCreated.length} items` : 'all already exist');
  console.log('Seeded 3-4 realistic dummy records for Patients, Appointments, Queue Visits, and Invoices.');
  console.log('Default logins (dev only):');
  console.log('  admin@saidental.local / Admin@123  (admin)');
  console.log('  doctor@saidental.local / Doctor@123  (doctor)');
  console.log('  reception@saidental.local / Reception@123  (receptionist)');
  console.log('  pharmacy@saidental.local / Pharmacy@123  (pharmacy)');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});