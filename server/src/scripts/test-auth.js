/* Integration test: authentication + RBAC for all 4 roles.
   Uses an in-memory MongoDB so no external database is required.
   Run with: npm run test:auth */
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');

process.env.NODE_ENV = 'test';

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri('auth_test');

  const { connectDB } = require('../config/db');
  await connectDB();

  const { createSeedUsers } = require('../utils/seed');
  await createSeedUsers();

  const { protect, authorize } = require('../middleware/auth');

  // Test-only RBAC probe app (not part of the production API)
  const rbacApp = express();
  rbacApp.get('/admin', protect, authorize('admin'), (req, res) =>
    res.json({ success: true, role: req.user.role }),
  );
  rbacApp.get(
    '/staff',
    protect,
    authorize('admin', 'doctor', 'receptionist'),
    (req, res) => res.json({ success: true, role: req.user.role }),
  );

  const mainApp = require('../app');
  const server = await new Promise((resolve) => {
    const srv = mainApp.listen(0, () => resolve(srv));
  });
  const rbacServer = await new Promise((resolve) => {
    const srv = rbacApp.listen(0, () => resolve(srv));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const rbacBase = `http://127.0.0.1:${rbacServer.address().port}`;

  let failures = 0;
  const pass = (m) => console.log('  [PASS]', m);
  const fail = (m) => {
    failures += 1;
    console.error('  [FAIL]', m);
  };
  const check = (cond, msg) => (cond ? pass(msg) : fail(msg));
  const section = (title) => console.log(`\n--- ${title} ---`);

  async function call(baseUrl, method, path, { body, token } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(baseUrl + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try {
      json = await res.json();
    } catch {}
    return { status: res.status, json };
  }

  const roles = [
    { role: 'admin', email: 'admin@saidental.local', password: 'Admin@123', admin: 200, staff: 200 },
    { role: 'doctor', email: 'doctor@saidental.local', password: 'Doctor@123', admin: 403, staff: 200 },
    { role: 'receptionist', email: 'reception@saidental.local', password: 'Reception@123', admin: 403, staff: 200 },
    { role: 'pharmacy', email: 'pharmacy@saidental.local', password: 'Pharmacy@123', admin: 403, staff: 403 },
  ];

  for (const role of roles) {
    section(role.role.toUpperCase());
    const bad = await call(base, 'POST', '/api/auth/login', {
      body: { email: role.email, password: 'wrong-password' },
    });
    check(bad.status === 401, `wrong password rejected (got ${bad.status})`);

    const login = await call(base, 'POST', '/api/auth/login', {
      body: { email: role.email, password: role.password },
    });
    check(login.status === 200, `login succeeds (got ${login.status})`);
    if (login.status !== 200) {
      fail(`unexpected login body ${JSON.stringify(login.json)}`);
      continue;
    }
    const { accessToken, refreshToken, user } = login.json;
    check(user.role === role.role, `returned role is ${role.role}`);
    check(!!accessToken && !!refreshToken, 'issued access + refresh tokens');

    const me = await call(base, 'GET', '/api/auth/me', { token: accessToken });
    check(me.status === 200 && me.json.user.email === role.email, 'GET /me returns current user');

    const probe = await call(rbacBase, 'GET', '/admin', { token: accessToken });
    check(probe.status === role.admin, `RBAC /admin expected ${role.admin}, got ${probe.status}`);

    const staffProbe = await call(rbacBase, 'GET', '/staff', { token: accessToken });
    check(staffProbe.status === role.staff, `RBAC /staff expected ${role.staff}, got ${staffProbe.status}`);

    const refreshed = await call(base, 'POST', '/api/auth/refresh', { body: { refreshToken } });
    check(refreshed.status === 200 && !!refreshed.json.accessToken, 'refresh issues new access token');

    const loggedOut = await call(base, 'POST', '/api/auth/logout', { token: accessToken });
    check(loggedOut.status === 200, 'logout succeeds');

    const reuseOldRefresh = await call(base, 'POST', '/api/auth/refresh', { body: { refreshToken } });
    check(reuseOldRefresh.status === 401, 'old refresh token rejected after logout');
  }

  section('GENERAL');
  const noToken = await call(base, 'GET', '/api/auth/me');
  check(noToken.status === 401, 'no token -> 401');
  const badToken = await call(base, 'GET', '/api/auth/me', { token: 'not.a.jwt' });
  check(badToken.status === 401, 'malformed token -> 401');
  const invalidLogin = await call(base, 'POST', '/api/auth/login', {
    body: { email: 'ghost@x.com', password: 'whatever' },
  });
  check(invalidLogin.status === 401, 'unknown user rejected');
  const missingCreds = await call(base, 'POST', '/api/auth/login', { body: {} });
  check(missingCreds.status === 400, 'missing credentials -> 400');

  section('REGISTRATION & PASSWORD CHANGE');
  const regUser = {
    name: 'Test New User',
    email: 'newuser@saidental.local',
    phone: '9876543210',
    password: 'NewUser123!',
    role: 'admin', // Attempting privileged role self-assignment
  };
  const regRes = await call(base, 'POST', '/api/auth/register', { body: regUser });
  check(regRes.status === 201, 'registration succeeds (201)');
  check(regRes.json.user?.role === 'receptionist', 'self-assigned admin overridden to unprivileged role');
  const regToken = regRes.json.accessToken;

  const dupReg = await call(base, 'POST', '/api/auth/register', { body: regUser });
  check(dupReg.status === 400, 'duplicate email registration rejected');

  const wrongCurrentPw = await call(base, 'POST', '/api/auth/change-password', {
    token: regToken,
    body: { currentPassword: 'WrongPassword!', newPassword: 'BrandNewPw123!' },
  });
  check(wrongCurrentPw.status === 400, 'change password with wrong current password rejected');

  const samePw = await call(base, 'POST', '/api/auth/change-password', {
    token: regToken,
    body: { currentPassword: 'NewUser123!', newPassword: 'NewUser123!' },
  });
  check(samePw.status === 400, 'change password with same password rejected');

  const changePwRes = await call(base, 'POST', '/api/auth/change-password', {
    token: regToken,
    body: { currentPassword: 'NewUser123!', newPassword: 'BrandNewPw123!' },
  });
  check(changePwRes.status === 200, 'change password succeeds');

  const oldPwLogin = await call(base, 'POST', '/api/auth/login', {
    body: { email: regUser.email, password: 'NewUser123!' },
  });
  check(oldPwLogin.status === 401, 'login with old password rejected');

  const newPwLogin = await call(base, 'POST', '/api/auth/login', {
    body: { email: regUser.email, password: 'BrandNewPw123!' },
  });
  check(newPwLogin.status === 200, 'login with updated password succeeds');

  await server.close();
  await rbacServer.close();
  await mongod.stop();

  console.log(`\n${failures === 0 ? 'ALL AUTH TESTS PASSED' : `${failures} TEST(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});