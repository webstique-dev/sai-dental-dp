const { User, ROLES } = require('../models/User');
const { recordAudit } = require('../utils/audit');
const ApiError = require('../utils/ApiError');

async function listUsers({ role, q, includeInactive = 'true' } = {}) {
  const query = {};
  if (role && ROLES.includes(role)) {
    query.role = role;
  }
  if (includeInactive !== 'true') {
    query.isActive = true;
  }
  if (q && q.trim()) {
    const rx = new RegExp(q.trim(), 'i');
    query.$or = [{ name: rx }, { email: rx }, { phone: rx }, { specialization: rx }];
  }

  const users = await User.find(query).sort({ createdAt: -1 });
  return users.map((u) => u.toSafeJSON());
}

async function getUser(id) {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User account not found');
  return user.toSafeJSON();
}

async function createUser(payload, actor) {
  if (!payload.email || !payload.name || !payload.password) {
    throw new ApiError(400, 'Name, email, and password are required');
  }
  const email = String(payload.email).trim().toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, 'An account with this email already exists');

  const role = payload.role && ROLES.includes(payload.role) ? payload.role : 'receptionist';

  const user = await User.create({
    name: String(payload.name).trim(),
    email,
    password: payload.password,
    phone: payload.phone ? String(payload.phone).trim() : '',
    role,
    specialization: payload.specialization ? String(payload.specialization).trim() : null,
    isActive: payload.isActive !== false,
  });

  await recordAudit({
    user: actor,
    action: 'create',
    entity: 'user',
    entityId: user._id,
    description: `Staff account created: ${user.name} (${user.role})`,
    meta: { email: user.email, role: user.role },
  });

  return user.toSafeJSON();
}

async function updateUser(id, payload, actor) {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User account not found');

  if (payload.name !== undefined) user.name = String(payload.name).trim();
  if (payload.phone !== undefined) user.phone = String(payload.phone).trim();
  if (payload.specialization !== undefined) user.specialization = String(payload.specialization).trim() || null;
  if (payload.role !== undefined) {
    if (!ROLES.includes(payload.role)) throw new ApiError(400, 'Invalid staff role');
    user.role = payload.role;
  }
  if (payload.isActive !== undefined) {
    user.isActive = Boolean(payload.isActive);
  }

  await user.save();

  await recordAudit({
    user: actor,
    action: 'update',
    entity: 'user',
    entityId: user._id,
    description: `Staff account updated: ${user.name} (${user.role})`,
    meta: { email: user.email, role: user.role, isActive: user.isActive },
  });

  return user.toSafeJSON();
}

async function toggleActive(id, actor) {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User account not found');

  // Prevent self-deactivation by admin
  if (String(user._id) === String(actor._id)) {
    throw new ApiError(400, 'You cannot deactivate your own admin account');
  }

  user.isActive = !user.isActive;
  await user.save();

  await recordAudit({
    user: actor,
    action: 'update',
    entity: 'user',
    entityId: user._id,
    description: `Staff account ${user.isActive ? 'reactivated' : 'deactivated'}: ${user.name}`,
    meta: { email: user.email, isActive: user.isActive },
  });

  return user.toSafeJSON();
}

async function resetPassword(id, newPassword, actor) {
  if (!newPassword || newPassword.length < 6) {
    throw new ApiError(400, 'New password must be at least 6 characters long');
  }
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User account not found');

  user.password = newPassword;
  await user.save();

  await recordAudit({
    user: actor,
    action: 'update',
    entity: 'user',
    entityId: user._id,
    description: `Admin reset password for staff user: ${user.name}`,
    meta: { email: user.email },
  });

  return user.toSafeJSON();
}

module.exports = {
  listUsers,
  getUser,
  createUser,
  updateUser,
  toggleActive,
  resetPassword,
};
