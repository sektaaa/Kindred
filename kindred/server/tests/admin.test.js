// Admin panel API tests: node --test tests/
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');

let mem;
let app;
const ADMIN = { email: 'admin@kindred.app', password: 'Admin@12345' };

before(async () => {
  let uri = process.env.MONGO_URI_TEST;
  if (!uri) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mem = await MongoMemoryServer.create();
    uri = mem.getUri('kindred_admin_test');
  } else {
    uri = uri.replace(/\/[^/?]*(\?|$)/, '/kindred_admin_test$1');
  }
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
  const { seed } = require('../src/seed/seed');
  await seed({ disconnect: false });
  app = require('../src/app')();
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (mem) await mem.stop();
});

async function loginAs(email, password) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email, password });
  assert.equal(res.status, 200, `login ${email}: ${res.body.message}`);
  return agent;
}

test('default admin exists and can log in', async () => {
  const admin = await loginAs(ADMIN.email, ADMIN.password);
  const me = await admin.get('/api/auth/me');
  assert.equal(me.body.data.user.role, 'admin');
});

test('members cannot reach admin routes; admins cannot use dating routes', async () => {
  const member = await loginAs('demo.eco@kindred.app', 'Demo1234');
  assert.equal((await member.get('/api/admin/stats/overview')).status, 403);
  const admin = await loginAs(ADMIN.email, ADMIN.password);
  assert.equal((await admin.get('/api/discover')).status, 403);
  assert.equal((await request(app).get('/api/admin/users')).status, 401);
});

test('analytics overview and time series', async () => {
  const admin = await loginAs(ADMIN.email, ADMIN.password);
  const o = (await admin.get('/api/admin/stats/overview')).body.data;
  assert.equal(o.users.total, 15);
  assert.equal(o.users.admins, 1);
  assert.equal(o.byCommunity.sober, 5);
  assert.ok(o.engagement.matches >= 3);
  assert.ok(o.engagement.conversations >= 3);
  assert.ok(o.rates.profileCompletion > 0);
  const ts = (await admin.get('/api/admin/stats/timeseries?days=30')).body.data;
  assert.equal(ts.length, 30);
  assert.ok(ts.reduce((s, d) => s + d.signups, 0) >= 1);
});

test('list, search, filter, view and edit a user', async () => {
  const admin = await loginAs(ADMIN.email, ADMIN.password);
  let res = await admin.get('/api/admin/users?search=ananya');
  assert.equal(res.body.data.total, 1);
  const ananya = res.body.data.users[0];
  assert.equal(ananya.passwordHash, undefined);

  res = await admin.get('/api/admin/users?community=neurodiverse&limit=2');
  assert.equal(res.body.data.users.length, 2);
  assert.equal(res.body.data.total, 5);

  res = await admin.get(`/api/admin/users/${ananya.id}`);
  assert.ok(res.body.data.stats.swipes);
  assert.ok(Array.isArray(res.body.data.stats.matchList));

  res = await admin.patch(`/api/admin/users/${ananya.id}`).send({ plan: 'premium', profile: { city: 'Mysuru', values: ['vegan', 'cycling'] } });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.user.plan, 'premium');
  assert.equal(res.body.data.user.profile.city, 'Mysuru');

  // Values must belong to the member's community
  res = await admin.patch(`/api/admin/users/${ananya.id}`).send({ profile: { values: ['alcohol-free'] } });
  assert.equal(res.status, 400);

  const logs = (await admin.get('/api/admin/logs')).body.data;
  assert.ok(logs.some((l) => l.action === 'user.update' && l.targetId === ananya.id));
});

test('suspend blocks login and hides the user from discover', async () => {
  const admin = await loginAs(ADMIN.email, ADMIN.password);
  const target = (await admin.get('/api/admin/users?search=rohan')).body.data.users[0];
  let res = await admin.patch(`/api/admin/users/${target.id}`).send({ status: 'suspended' });
  assert.equal(res.status, 200);
  res = await request(app).post('/api/auth/login').send({ email: target.email, password: 'Demo1234' });
  assert.equal(res.status, 403);
  const eco = await loginAs('demo.eco@kindred.app', 'Demo1234');
  const feed = (await eco.get('/api/discover')).body.data;
  assert.ok(!feed.some((f) => f.profile.id === target.id));
  await admin.patch(`/api/admin/users/${target.id}`).send({ status: 'active' });
});

test('reset a password', async () => {
  const admin = await loginAs(ADMIN.email, ADMIN.password);
  const target = (await admin.get('/api/admin/users?search=tara')).body.data.users[0];
  const res = await admin.post(`/api/admin/users/${target.id}/password`).send({ password: 'NewPass123' });
  assert.equal(res.status, 200);
  await loginAs(target.email, 'NewPass123');
});

test('create a new admin, who can then manage users; guard rails hold', async () => {
  const admin = await loginAs(ADMIN.email, ADMIN.password);
  let res = await admin.post('/api/admin/admins').send({ name: 'Second Admin', email: 'second@kindred.app', password: 'Second123' });
  assert.equal(res.status, 201);
  res = await admin.post('/api/admin/admins').send({ name: 'X', email: 'second@kindred.app', password: 'Second123' });
  assert.equal(res.status, 409);

  const second = await loginAs('second@kindred.app', 'Second123');
  const admins = (await second.get('/api/admin/admins')).body.data;
  assert.equal(admins.length, 2);

  const meId = (await admin.get('/api/auth/me')).body.data.user.id;
  assert.equal((await admin.delete(`/api/admin/users/${meId}`)).status, 400, 'cannot delete self');
  assert.equal((await admin.post(`/api/admin/users/${meId}/role`).send({ role: 'user' })).status, 400, 'cannot demote self');
  assert.equal((await admin.patch(`/api/admin/users/${meId}`).send({ status: 'suspended' })).status, 400, 'cannot suspend self');

  // Promote a member to admin, then demote back
  const member = (await admin.get('/api/admin/users?search=dev')).body.data.users[0];
  res = await admin.post(`/api/admin/users/${member.id}/role`).send({ role: 'admin' });
  assert.equal(res.body.data.user.role, 'admin');
  res = await admin.post(`/api/admin/users/${member.id}/role`).send({ role: 'user' });
  assert.equal(res.body.data.user.role, 'user');
});

test('delete a user removes their likes, matches and messages', async () => {
  const admin = await loginAs(ADMIN.email, ADMIN.password);
  const target = (await admin.get('/api/admin/users?search=arjun')).body.data.users[0];
  const before = (await admin.get('/api/admin/stats/overview')).body.data.engagement;
  const res = await admin.delete(`/api/admin/users/${target.id}`);
  assert.equal(res.status, 200);
  const after = (await admin.get('/api/admin/stats/overview')).body.data.engagement;
  assert.ok(after.matches < before.matches);
  assert.ok(after.messages < before.messages);
  assert.equal((await admin.get(`/api/admin/users/${target.id}`)).status, 404);
});

test('event CRUD', async () => {
  const admin = await loginAs(ADMIN.email, ADMIN.password);
  let res = await admin.post('/api/admin/events').send({ community: 'sober', title: 'Test walk', date: '2030-01-10T10:00:00Z', city: 'Pune' });
  assert.equal(res.status, 201);
  const id = res.body.data._id;
  res = await admin.patch(`/api/admin/events/${id}`).send({ featured: true });
  assert.equal(res.body.data.featured, true);
  res = await admin.delete(`/api/admin/events/${id}`);
  assert.equal(res.status, 200);
  res = await admin.post('/api/admin/events').send({ community: 'mars', title: '' });
  assert.equal(res.status, 400);
});

test('admin can update own name and password', async () => {
  const admin = await loginAs('second@kindred.app', 'Second123');
  let res = await admin.patch('/api/admin/me').send({ name: 'Ops Admin', currentPassword: 'wrong', newPassword: 'Another123' });
  assert.equal(res.status, 400);
  res = await admin.patch('/api/admin/me').send({ name: 'Ops Admin', currentPassword: 'Second123', newPassword: 'Another123' });
  assert.equal(res.status, 200);
  await loginAs('second@kindred.app', 'Another123');
});
