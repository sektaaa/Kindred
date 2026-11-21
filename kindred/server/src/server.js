const env = require('./config/env');
const connectDB = require('./config/db');
const createApp = require('./app');
const ensureDefaultAdmin = require('./services/bootstrapAdmin');

async function start() {
  await connectDB(env.mongoUri);
  await ensureDefaultAdmin();
  const app = createApp();
  app.listen(env.port, () => console.log(`Kindred API running on http://localhost:${env.port}/api`));
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
