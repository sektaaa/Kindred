// Event features: search, detail, RSVP, check-in, attendance, reactions, comments, photos, activity.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');

let mem;
let app;

// 1x1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

before(async () => {
  let uri = process.env.MONGO_URI_TEST;
  if (!uri) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mem = await MongoMemoryServer.create();
    uri = mem.getUri('kindred_events_test');
  } else {
    uri = uri.replace(/\/[^/?]*(\?|$)/, '/kindred_events_test$1');
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

async function loginAs(email, password = 'Demo1234') {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email, password });
  assert.equal(res.status, 200, res.body.message);
  return agent;
}

test('list is community-scoped, searchable and has counts', async () => {
  const nd = await loginAs('demo.neurodiverse@kindred.app');
  const all = (await nd.get('/api/events?when=all')).body.data;
  assert.ok(all.length >= 3);
  assert.ok(all.every((e) => e.community === 'neurodiverse'));
  const found = (await nd.get('/api/events?when=all&search=board')).body.data;
  assert.ok(found.length >= 1 && found.every((e) => /board/i.test(e.title + e.description)));
  const past = (await nd.get('/api/events?when=past')).body.data;
  assert.ok(past.some((e) => e.phase === 'completed' && e.counts.attended === 2));
  const upcoming = (await nd.get('/api/events')).body.data;
  assert.ok(upcoming.some((e) => e.phase === 'live'));
  assert.ok(!upcoming.some((e) => e.status === 'completed'));
});

test('member cannot open another community event', async () => {
  const admin = await loginAs('admin@kindred.app', 'Admin@12345');
  const soberEvent = (await admin.get('/api/events?when=all&community=sober')).body.data[0];
  const nd = await loginAs('demo.neurodiverse@kindred.app');
  assert.equal((await nd.get(`/api/events/${soberEvent.id}`)).status, 404);
});

test('RSVP, check-in, reactions, comments and photos on a live event', async () => {
  const nd = await loginAs('demo.neurodiverse@kindred.app');
  const live = (await nd.get('/api/events')).body.data.find((e) => e.phase === 'live');
  let d = (await nd.get(`/api/events/${live.id}`)).body.data;
  assert.equal(d.permissions.canCheckIn, true);
  assert.equal(d.permissions.canUpload, false);

  let res = await nd.post(`/api/events/${live.id}/photos`).attach('photo', PNG, { filename: 'a.png', contentType: 'image/png' });
  assert.equal(res.status, 403, 'needs RSVP before uploading');

  assert.equal((await nd.post(`/api/events/${live.id}/rsvp`).send({ rsvp: 'going' })).status, 200);
  assert.equal((await nd.post(`/api/events/${live.id}/checkin`)).status, 200);
  res = await nd.post(`/api/events/${live.id}/reaction`).send({ value: 'like' });
  assert.equal(res.body.data.myReaction, 'like');
  res = await nd.post(`/api/events/${live.id}/reaction`).send({ value: 'dislike' });
  assert.equal(res.body.data.myReaction, 'dislike');
  assert.equal((await nd.post(`/api/events/${live.id}/comments`).send({ text: 'Lovely and quiet', kind: 'liked' })).status, 201);
  assert.equal((await nd.post(`/api/events/${live.id}/comments`).send({ text: '' })).status, 400);

  res = await nd.post(`/api/events/${live.id}/photos`).field('caption', 'Our table').attach('photo', PNG, { filename: 'a.png', contentType: 'image/png' });
  assert.equal(res.status, 201);
  const img = await nd.get(res.body.data.url);
  assert.equal(img.status, 200);
  assert.equal(img.headers['content-type'], 'image/png');

  res = await nd.post(`/api/events/${live.id}/photos`).attach('photo', Buffer.from('not an image'), { filename: 'a.txt', contentType: 'text/plain' });
  assert.equal(res.status, 400);

  d = (await nd.get(`/api/events/${live.id}`)).body.data;
  assert.equal(d.event.counts.myRsvp, 'going');
  assert.equal(d.event.counts.myAttendance, 'attended');
  assert.equal(d.event.counts.dislikes, 1);
  assert.ok(d.comments.some((c) => c.kind === 'liked' && c.mine));
  assert.equal(d.photos.length, 1);
  assert.ok(d.attendees.some((a) => a.isMe && a.attendance === 'attended'));

  // Members can't read the activity log or mark attendance
  assert.equal((await nd.get(`/api/events/${live.id}/activity`)).status, 403);
});

test('cannot RSVP to a past event; cancelled blocks RSVP', async () => {
  const nd = await loginAs('demo.neurodiverse@kindred.app');
  const past = (await nd.get('/api/events?when=past')).body.data[0];
  assert.equal((await nd.post(`/api/events/${past.id}/rsvp`).send({ rsvp: 'going' })).status, 400);
  // Feedback after the event is still allowed
  assert.equal((await nd.post(`/api/events/${past.id}/comments`).send({ text: 'Need more seating', kind: 'improve' })).status, 201);

  const admin = await loginAs('admin@kindred.app', 'Admin@12345');
  const upcoming = (await nd.get('/api/events')).body.data.find((e) => e.phase === 'upcoming');
  await admin.patch(`/api/admin/events/${upcoming.id}`).send({ status: 'cancelled' });
  assert.equal((await nd.post(`/api/events/${upcoming.id}/rsvp`).send({ rsvp: 'going' })).status, 400);
  await admin.patch(`/api/admin/events/${upcoming.id}`).send({ status: 'scheduled' });
});

test('admin sees all attendees, marks attendance, sees activity log, edits, sets cover', async () => {
  const admin = await loginAs('admin@kindred.app', 'Admin@12345');
  const past = (await admin.get('/api/events?when=past&community=eco')).body.data[0];
  let d = (await admin.get(`/api/events/${past.id}`)).body.data;
  assert.equal(d.permissions.canEdit, true);
  const noShow = d.attendees.find((a) => a.attendance === 'no_show');
  assert.ok(noShow, 'admin sees no-shows');
  assert.equal((await admin.post(`/api/events/${past.id}/attendance`).send({ userId: noShow.userId, attendance: 'attended' })).status, 200);
  d = (await admin.get(`/api/events/${past.id}`)).body.data;
  assert.equal(d.event.counts.attended, 3);

  // Members only see the person as pending, never "no show"
  const eco = await loginAs('demo.eco@kindred.app');
  const md = (await eco.get(`/api/events/${past.id}`)).body.data;
  assert.ok(!md.attendees.some((a) => a.attendance === 'no_show'));

  const up = await admin.post(`/api/events/${past.id}/photos`).field('cover', 'true').attach('photo', PNG, { filename: 'c.png', contentType: 'image/png' });
  assert.equal(up.status, 201);
  d = (await admin.get(`/api/events/${past.id}`)).body.data;
  assert.ok(d.event.coverUrl);
  assert.ok(d.photos[0].isCover);

  await admin.patch(`/api/admin/events/${past.id}`).send({ title: 'Zero-waste picnic (edited)', capacity: 25 });
  const log = (await admin.get(`/api/events/${past.id}/activity`)).body.data;
  assert.ok(log.some((l) => l.type === 'attendance'));
  assert.ok(log.some((l) => l.type === 'edited'));
  assert.ok(log.some((l) => l.type === 'cover'));
});

test('capacity limits going RSVPs', async () => {
  const admin = await loginAs('admin@kindred.app', 'Admin@12345');
  const ev = (await admin.post('/api/admin/events').send({ community: 'sober', title: 'Tiny meetup', date: new Date(Date.now() + 86400000).toISOString(), capacity: 1 })).body.data;
  const a = await loginAs('demo.sober@kindred.app');
  const b = await loginAs('aarav.sober@kindred.app');
  assert.equal((await a.post(`/api/events/${ev._id}/rsvp`).send({ rsvp: 'going' })).status, 200);
  assert.equal((await b.post(`/api/events/${ev._id}/rsvp`).send({ rsvp: 'going' })).status, 409);
  assert.equal((await b.post(`/api/events/${ev._id}/rsvp`).send({ rsvp: 'interested' })).status, 200);
});

test('interests appear in match reasons', async () => {
  const nd = await loginAs('demo.neurodiverse@kindred.app');
  const feed = (await nd.get('/api/discover')).body.data;
  assert.ok(feed.some((f) => f.reasons.some((r) => r.type === 'interests' && r.items.length)));
  assert.ok(feed[0].profile.interests.length > 0);
});
