require('dotenv').config();

const env = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kindred',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV || 'development',
  // Default admin, created on start-up only if the database has no admin yet.
  adminEmail: (process.env.ADMIN_EMAIL || 'admin@kindred.app').toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin@12345',
  adminName: process.env.ADMIN_NAME || 'Kindred Admin',
};

if (env.nodeEnv === 'production' && env.jwtSecret === 'dev-only-secret-change-me') {
  throw new Error('JWT_SECRET must be set in production');
}

module.exports = env;
