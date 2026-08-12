/* Integration test: Admin Module (Staff Accounts, Role Security, Settings, Analytics & JSON Backup)
   Run with: node src/scripts/test-admin-module.js */
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri('admin_test');

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

  // 1. Admin & Staff Auth
  section('1. Admin Authentication');
  const adminLogin = await call('POST', '/api/auth/login', {
    body: { email: 'admin@saidental.local', password: 'Admin@123' },
  });
  check(adminLogin.status === 200 && adminLogin.json.accessToken, 'Admin login successful');
  const adminToken = adminLogin.json.accessToken;

  const recLogin = await call('POST', '/api/auth/login', {
    body: { email: 'reception@saidental.local', password: 'Reception@123' },
  });
  check(recLogin.status === 200 && recLogin.json.accessToken, 'Receptionist login successful');
  const recToken = recLogin.json.accessToken;

  // 2. Staff Account & Role Management
  section('2. Staff Account & Role Management');
  const createStaff = await call('POST', '/api/users', {
    token: adminToken,
    body: {
      name: 'Dr. Test Specialist',
      email: 'test.doc@saidental.local',
      password: 'DocPassword@123',
      role: 'doctor',
      specialization: 'Periodontist',
    },
  });
  check(createStaff.status === 201 && createStaff.json.user.role === 'doctor', 'New doctor staff account created by admin');
  const newStaffId = createStaff.json.user.id || createStaff.json.user._id;

  const listUsers = await call('GET', '/api/users?role=doctor', { token: adminToken });
  check(listUsers.status === 200 && listUsers.json.users.some((u) => u.email === 'test.doc@saidental.local'), 'Staff user list filtered by doctor role');

  const updateStaff = await call('PATCH', `/api/users/${newStaffId}`, {
    token: adminToken,
    body: { specialization: 'Prosthodontist & Periodontist' },
  });
  check(updateStaff.status === 200 && updateStaff.json.user.specialization.includes('Prosthodontist'), 'Staff details updated by admin');

  const resetPass = await call('POST', `/api/users/${newStaffId}/reset-password`, {
    token: adminToken,
    body: { newPassword: 'NewSecurePassword@123' },
  });
  check(resetPass.status === 200, 'Admin password reset executed');

  const newDocLogin = await call('POST', '/api/auth/login', {
    body: { email: 'test.doc@saidental.local', password: 'NewSecurePassword@123' },
  });
  check(newDocLogin.status === 200 && newDocLogin.json.accessToken, 'Newly reset staff account login successful');

  const toggleDeactivate = await call('POST', `/api/users/${newStaffId}/toggle-active`, { token: adminToken });
  check(toggleDeactivate.status === 200 && toggleDeactivate.json.user.isActive === false, 'Staff account deactivated by admin');

  const blockedLogin = await call('POST', '/api/auth/login', {
    body: { email: 'test.doc@saidental.local', password: 'NewSecurePassword@123' },
  });
  check(blockedLogin.status === 403, 'Deactivated staff login attempt blocked by server (403 Forbidden)');

  const toggleReactivate = await call('POST', `/api/users/${newStaffId}/toggle-active`, { token: adminToken });
  check(toggleReactivate.status === 200 && toggleReactivate.json.user.isActive === true, 'Staff account reactivated');

  // 3. Access Control Role Boundary Enforcement
  section('3. Access Control Role Boundaries');
  const forbiddenUsers = await call('GET', '/api/users', { token: recToken });
  check(forbiddenUsers.status === 403, 'Receptionist blocked from /api/users (403 Forbidden)');

  const forbiddenSettings = await call('PATCH', '/api/settings', {
    token: recToken,
    body: { clinicName: 'Hacked Clinic' },
  });
  check(forbiddenSettings.status === 403, 'Receptionist blocked from updating clinic settings (403 Forbidden)');

  const forbiddenBackup = await call('GET', '/api/admin/backup/export', { token: recToken });
  check(forbiddenBackup.status === 403, 'Receptionist blocked from downloading database backup (403 Forbidden)');

  // 4. Clinic Settings & Profile
  section('4. Clinic Settings & Profile');
  const getSet = await call('GET', '/api/settings', { token: recToken });
  check(getSet.status === 200 && getSet.json.settings.clinicName, 'Clinic settings read by staff');

  const updateSet = await call('PATCH', '/api/settings', {
    token: adminToken,
    body: {
      clinicName: 'Sai Dental & Implant Center',
      workingHours: 'Mon-Sat: 8:30 AM - 8:30 PM',
      slotDurationMinutes: 45,
      branches: [
        { name: 'Anna Nagar Main', address: 'Anna Nagar West', phone: '+91 98400 12345', isPrimary: true },
        { name: 'Adyar Branch', address: 'Adyar, Chennai', phone: '+91 98400 54321', isPrimary: false },
      ],
    },
  });
  check(updateSet.status === 200 && updateSet.json.settings.slotDurationMinutes === 45, 'Clinic settings and multi-branch configuration updated');

  // 5. Executive Analytics
  section('5. Cross-Module Executive Analytics');
  const analyticsRes = await call('GET', `/api/reports/analytics?startDate=2026-01-01&endDate=${new Date().toISOString().split('T')[0]}`, { token: adminToken });
  check(analyticsRes.status === 200 && analyticsRes.json.analytics.period, 'Executive analytics data retrieved');
  check(typeof analyticsRes.json.analytics.revenue.totalRupees === 'number', 'Executive revenue aggregation verified');

  // 6. Database JSON Backup Export & Audit Logs
  section('6. Database Backup & Audit Logs');
  const backupRes = await call('GET', '/api/admin/backup/export', { token: adminToken });
  check(backupRes.status === 200 && backupRes.json.data && backupRes.json.stats.users >= 1, 'Full database JSON backup export generated');

  const auditRes = await call('GET', '/api/admin/audit-logs', { token: adminToken });
  check(auditRes.status === 200 && auditRes.json.logs.length >= 1, 'System audit log entries fetched');

  server.close();
  await mongod.stop();

  if (failures > 0) {
    console.error(`\nTest suite finished with ${failures} failure(s).`);
    process.exit(1);
  } else {
    console.log('\nAll Admin module integration tests passed successfully!');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error during admin test run:', err);
  process.exit(1);
});
