// End-to-end API test: node --test tests/
// Uses MONGO_URI_TEST if set, otherwise spins up an in-memory MongoDB.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');

let mem;
let app;

before(async () => {
  let uri = process.env.MONGO_URI_TEST;
  if (!uri) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mem = await MongoMemoryServer.create();
    uri = mem.getUri('kindred_test');
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

const agent = () => request.agent(app);

test('health check', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
});

test('signup validation rejects weak password and bad community', async () => {
  const res = await request(app).post('/api/auth/signup').send({ email: 'x@y.com', password: 'short', community: 'mars' });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.ok(res.body.details.length >= 2);
});

test('protected routes need auth', async () => {
  const res = await request(app).get('/api/discover');
  assert.equal(res.status, 401);
});

test('full journey: signup -> profile -> discover -> like -> match -> chat', async () => {
  const a = agent();
  let res = await a.post('/api/auth/signup').send({ email: 'new.nd@test.com', password: 'Passw0rd!', community: 'neurodiverse' });
  assert.equal(res.status, 201);

  // Incomplete profile is blocked from discover (authorization)
  res = await a.get('/api/discover');
  assert.equal(res.status, 403);

  // Option from another community is rejected
  res = await a.put('/api/profile/me').send({ name: 'Test', age: 29, city: 'Bengaluru', values: ['vegan'] });
  assert.equal(res.status, 400);

  res = await a.put('/api/profile/me').send({
    name: 'Test', age: 29, city: 'Bengaluru', bio: 'hi',
    values: ['tech', 'board games', 'deep interests'],
    boundaries: ['no surprise calls'],
    sensoryPrefs: ['quiet places'],
    identityTags: ['ADHD'],
    commStyle: { prefersText: true, replyPace: 'slow', directness: 'high' },
    lookingFor: 'long-term',
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.user.profileComplete, true);

  res = await a.get('/api/discover');
  assert.equal(res.status, 200);
  const feed = res.body.data;
  assert.ok(feed.length > 0);
  assert.ok(feed.every((f) => f.profile.community === 'neurodiverse'), 'only same-community profiles');
  assert.ok(feed[0].compatibility >= feed[feed.length - 1].compatibility, 'sorted by compatibility');
  assert.ok(feed[0].reasons.length > 0, 'explains why');
  assert.equal(feed[0].profile.email, undefined, 'no private fields leak');
  const top = feed[0];
  console.log('Top match:', top.profile.name, top.compatibility + '%', top.reasons);

  // Like someone; then have them like back -> match
  res = await a.post('/api/swipes').send({ toUser: top.profile.id, action: 'like' });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.matched, false);

  const b = agent();
  const otherEmail = `${top.profile.name.toLowerCase()}.neurodiverse@kindred.app`;
  res = await b.post('/api/auth/login').send({ email: otherEmail, password: 'Demo1234' });
  assert.equal(res.status, 200);
  const myId = (await a.get('/api/auth/me')).body.data.user.id;
  res = await b.post('/api/swipes').send({ toUser: myId, action: 'like' });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.matched, true);
  const matchId = res.body.data.matchId;

  // Chat both ways
  res = await a.post(`/api/matches/${matchId}/messages`).send({ text: 'Hi! Text is great for me.' });
  assert.equal(res.status, 201);
  res = await b.post(`/api/matches/${matchId}/messages`).send({ text: 'Same here :)' });
  assert.equal(res.status, 201);
  res = await a.get(`/api/matches/${matchId}/messages`);
  assert.equal(res.body.data.messages.length, 2);
  assert.equal(res.body.data.messages[0].mine, true);

  // Empty message rejected
  res = await a.post(`/api/matches/${matchId}/messages`).send({ text: '   ' });
  assert.equal(res.status, 400);

  // A third user cannot read this chat
  const c = agent();
  await c.post('/api/auth/login').send({ email: 'demo.neurodiverse@kindred.app', password: 'Demo1234' });
  res = await c.get(`/api/matches/${matchId}/messages`);
  assert.equal(res.status, 404);

  res = await a.get('/api/matches');
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].lastMessage.text, 'Same here :)');
});

test('demo account gets instant matches from seeded likes', async () => {
  const a = agent();
  await a.post('/api/auth/login').send({ email: 'demo.eco@kindred.app', password: 'Demo1234' });
  const feed = (await a.get('/api/discover')).body.data;
  const ananya = feed.find((f) => f.profile.name === 'Ananya');
  assert.ok(ananya);
  const res = await a.post('/api/swipes').send({ toUser: ananya.profile.id, action: 'like' });
  assert.equal(res.body.data.matched, true);
  assert.deepEqual(res.body.data.profile.identityTags.length > 0, true, 'matches can see identity tags');
});

test('premium gating on likes received', async () => {
  const a = agent();
  await a.post('/api/auth/login').send({ email: 'demo.sober@kindred.app', password: 'Demo1234' });
  let res = await a.get('/api/likes/received');
  assert.equal(res.body.data.locked, true);
  assert.ok(res.body.data.count >= 1);
  await a.post('/api/profile/me/upgrade');
  res = await a.get('/api/likes/received');
  assert.equal(res.body.data.locked, false);
  assert.equal(res.body.data.profiles.length, res.body.data.count);
});

test('blocking removes a profile from discover and from profile view', async () => {
  const a = agent();
  await a.post('/api/auth/login').send({ email: 'demo.neurodiverse@kindred.app', password: 'Demo1234' });
  const feed = (await a.get('/api/discover')).body.data;
  const target = feed[0].profile.id;
  let res = await a.post(`/api/profile/${target}/block`);
  assert.equal(res.status, 200);
  const after = (await a.get('/api/discover')).body.data;
  assert.ok(!after.some((f) => f.profile.id === target));
});

test('events are scoped to community', async () => {
  const a = agent();
  await a.post('/api/auth/login').send({ email: 'demo.sober@kindred.app', password: 'Demo1234' });
  const res = await a.get('/api/events');
  assert.ok(res.body.data.length >= 1);
  assert.ok(res.body.data.every((e) => e.community === 'sober'));
});

test('invalid id gets 400 not 500', async () => {
  const a = agent();
  await a.post('/api/auth/login').send({ email: 'demo.sober@kindred.app', password: 'Demo1234' });
  const res = await a.get('/api/profile/not-an-id');
  assert.equal(res.status, 400);
});
