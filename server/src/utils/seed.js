const { User } = require('../models/User');

const DEFAULT_USERS = [
  {
    name: 'Admin User',
    email: 'admin@saidental.local',
    password: 'Admin@123',
    role: 'admin',
    phone: '+91-0000000001',
  },
  {
    name: 'Dr. Meera Nair',
    email: 'doctor@saidental.local',
    password: 'Doctor@123',
    role: 'doctor',
    specialization: 'General Dentistry',
    phone: '+91-0000000002',
  },
  {
    name: 'Rekha Receptionist',
    email: 'reception@saidental.local',
    password: 'Reception@123',
    role: 'receptionist',
    phone: '+91-0000000003',
  },
  {
    name: 'Pharmacy Staff',
    email: 'pharmacy@saidental.local',
    password: 'Pharmacy@123',
    role: 'pharmacy',
    phone: '+91-0000000004',
  },
];

async function createSeedUsers() {
  const created = [];
  for (const data of DEFAULT_USERS) {
    const exists = await User.findOne({ email: data.email.toLowerCase() });
    if (!exists) {
      await User.create(data);
      created.push(data.role);
    }
  }
  return created;
}

module.exports = { createSeedUsers, DEFAULT_USERS };