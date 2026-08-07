const mongoose = require('mongoose');
const env = require('./env');

async function connectDB() {
  if (!env.MONGO_URI) {
    console.warn('[db] MONGO_URI is not set. Skipping MongoDB connection.');
    return false;
  }

  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[db] MongoDB connected: ${conn.connection.host}`);
    return true;
  } catch (err) {
    console.error(`[db] MongoDB connection failed: ${err.message}`);
    return false;
  }
}

module.exports = { connectDB };