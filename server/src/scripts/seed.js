const { connectDB } = require('../config/db');
const { createSeedUsers } = require('../utils/seed');

async function run() {
  const ok = await connectDB();
  if (!ok) {
    console.error('Seed aborted: could not connect to MongoDB.');
    process.exit(1);
  }
  const created = await createSeedUsers();
  console.log('Seeded users (roles):', created.length ? created.join(', ') : 'all already exist');
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