const { User } = require('../models/User');
const ApiError = require('../utils/ApiError');
const token = require('../utils/token');

async function login(email, password) {
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).select(
    '+password',
  );
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been deactivated');
  }

  user.lastLoginAt = new Date();
  const tokens = await issueTokens(user);
  await user.save({ validateBeforeSave: false });

  return { user: user.toSafeJSON(), ...tokens };
}

async function refresh(refreshToken, accessToken) {
  if (!refreshToken) {
    throw new ApiError(400, 'Refresh token is required');
  }

  const payload = safelyVerify(() =>
    token.verifyRefreshToken(refreshToken),
  );
  if (!payload) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  const user = await User.findById(payload.sub).select('+refreshToken');
  if (!user || !user.isActive) {
    throw new ApiError(401, 'User not found or deactivated');
  }
  if (!user.refreshToken || user.refreshToken !== refreshToken) {
    throw new ApiError(401, 'Refresh token no longer valid');
  }

  const newTokens = await issueTokens(user);
  await user.save({ validateBeforeSave: false });

  return { user: user.toSafeJSON(), ...newTokens };
}

async function register(userData) {
  const { name, email, phone, password, role } = userData || {};
  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email, and password are required');
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw new ApiError(400, 'Please provide a valid email address');
  }

  if (password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters long');
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ApiError(400, 'An account with this email already exists');
  }

  let assignedRole = 'receptionist';
  const allowedRoles = ['admin', 'receptionist', 'doctor', 'pharmacy'];
  if (role && allowedRoles.includes(role)) {
    assignedRole = role;
  }

  const user = new User({
    name: name.trim(),
    email: normalizedEmail,
    phone: phone ? phone.trim() : '',
    password,
    role: assignedRole,
  });

  await user.save();

  return { user: user.toSafeJSON() };
}

async function changePassword(userId, { currentPassword, newPassword }) {
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current password and new password are required');
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, 'New password must be at least 6 characters long');
  }

  if (currentPassword === newPassword) {
    throw new ApiError(400, 'New password cannot be the same as current password');
  }

  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  user.password = newPassword;
  user.refreshToken = null;
  await user.save();

  const tokens = await issueTokens(user);
  await user.save({ validateBeforeSave: false });

  return { user: user.toSafeJSON(), ...tokens };
}

async function logout(userId) {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
}

async function issueTokens(user) {
  const accessToken = token.signAccessToken(user._id.toString());
  const refreshToken = token.signRefreshToken(user._id.toString());
  user.refreshToken = refreshToken;
  return { accessToken, refreshToken };
}

function safelyVerify(fn) {
  try {
    return fn();
  } catch {
    return null;
  }
}

module.exports = { login, register, changePassword, refresh, logout, issueTokens };