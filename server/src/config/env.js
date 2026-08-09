require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'development';

const env = {
  NODE_ENV,
  PORT: parseInt(process.env.PORT, 10) || 5000,
  MONGO_URI: process.env.MONGO_URI || '',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-access-secret',
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '15m',
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '7d',
  // How many days ahead a batch is flagged as "expiring soon".
  EXPIRY_WARNING_DAYS: parseInt(process.env.EXPIRY_WARNING_DAYS, 10) || 60,
};

// Fail fast in production when secrets/database credentials are missing.
// Dev-only fallback secrets must never be used against a live deployment.
if (NODE_ENV === 'production') {
  const required = ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'CLIENT_URL'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(
      `Missing required environment variables in production: ${missing.join(', ')}`,
    );
  }
}

module.exports = env;