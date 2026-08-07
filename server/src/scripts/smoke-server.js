/* Boots the real server against an in-memory MongoDB (no external DB needed)
   and seeds default roles. Keeps running until SIGTERM. Used for local smoke tests. */
const { MongoMemoryServer } = require('mongodb-memory-server');

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri('smoke_db');

  const { connectDB } = require('../config/db');
  await connectDB();
  const { createSeedUsers } = require('../utils/seed');
  await createSeedUsers();

  const app = require('../app');
  const port = parseInt(process.env.PORT, 10) || 5000;
  const server = app.listen(port, () => {
    console.log(`[smoke] READY on http://localhost:${port}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await mongod.stop();
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});