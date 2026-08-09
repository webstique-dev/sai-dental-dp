require('dotenv').config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
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

module.exports = env;