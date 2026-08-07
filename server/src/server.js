const app = require('./app');
const env = require('./config/env');
const { connectDB } = require('./config/db');

async function start() {
  await connectDB();

  app.listen(env.PORT, () => {
    console.log(
      `[server] Sai Dental API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`,
    );
  });
}

start().catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});