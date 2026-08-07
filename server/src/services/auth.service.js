const { User } = require('../models/User');
const ApiError = require('../utils/ApiError');
const token = require('../utils/token');

async function login(email, password) {
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select(
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

module.exports = { login, refresh, logout, issueTokens };