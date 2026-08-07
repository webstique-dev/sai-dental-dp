const { User } = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const token = require('../utils/token');

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const accessToken = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!accessToken) {
    throw new ApiError(401, 'Not authenticated');
  }

  let payload;
  try {
    payload = token.verifyAccessToken(accessToken);
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new ApiError(401, 'User no longer exists');
  }
  if (!user.isActive) {
    throw new ApiError(403, 'Account has been deactivated');
  }

  req.user = user;
  next();
});

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(401, 'Not authenticated'));
  }
  if (!roles.includes(req.user.role)) {
    return next(
      new ApiError(403, 'You do not have permission to perform this action'),
    );
  }
  next();
};

module.exports = { protect, authorize };