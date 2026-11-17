const bcrypt = require('bcryptjs');
const User = require('../models/User');
const env = require('../config/env');

/**
 * Makes sure at least one admin exists. Runs on every server start and after seeding,
 * so a fresh database always has a way into the admin panel.
 * Credentials come from ADMIN_EMAIL / ADMIN_PASSWORD (see .env.example).
 */
async function ensureDefaultAdmin() {
  const existing = await User.exists({ role: 'admin' });
  if (existing) return null;

  const passwordHash = await bcrypt.hash(env.adminPassword, 12);
  const admin = await User.create({
    email: env.adminEmail,
    passwordHash,
    role: 'admin',
    profile: { name: env.adminName },
    profileComplete: false,
  });
  console.log(`Default admin created: ${env.adminEmail} (change the password after first login)`);
  return admin;
}

module.exports = ensureDefaultAdmin;
