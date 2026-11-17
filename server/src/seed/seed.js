// Seeds demo users, pre-existing likes (so a demo gets an instant match) and events.
// Usage: npm run seed      (WARNING: wipes the users/likes/matches/messages/events collections)
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');
const Like = require('../models/Like');
const Match = require('../models/Match');
const Message = require('../models/Message');
const Event = require('../models/Event');
const AdminLog = require('../models/AdminLog');
const ensureDefaultAdmin = require('../services/bootstrapAdmin');

const PASSWORD = 'Demo1234';
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (d, hour = 12) => new Date(Date.now() - d * DAY - hour * 60 * 60 * 1000);

// Backdates documents so the analytics dashboard shows realistic history.
async function backdate(Model, id, date) {
  await Model.collection.updateOne({ _id: id }, { $set: { createdAt: date, updatedAt: date } });
}

// Gives each community a little history: one mutual match with a short chat,
// plus one one-way like. Demo accounts are left untouched for live demos.
async function seedHistory(list, community) {
  const [a, , c, d] = list;
  const matchedAt = daysAgo(6);
  await Like.create([
    { fromUser: c._id, toUser: d._id, action: 'like' },
    { fromUser: d._id, toUser: c._id, action: 'like' },
    { fromUser: a._id, toUser: c._id, action: 'like' },
  ]);
  const match = await Match.create({
    users: [c._id, d._id].sort(),
    pairKey: Match.pairKeyFor(c._id, d._id),
    compatibility: 64,
    lastMessageAt: daysAgo(4),
  });
  await backdate(Match, match._id, matchedAt);
  const lines = [
    [c, 'Hi! Loved your profile.'],
    [d, 'Thank you! Yours too. How is your week going?'],
    [c, 'Good! Found a nice spot for the weekend, want to join?'],
    [d, 'Sounds lovely, yes.'],
  ];
  for (const [i, [who, text]] of lines.entries()) {
    const msg = await Message.create({ match: match._id, sender: who._id, text });
    await backdate(Message, msg._id, daysAgo(5 - i * 0.3));
  }
  return community;
}

const people = {
  sober: [
    { name: 'Aarav', age: 29, city: 'Bengaluru', bio: 'Two years sober, sunrise runner, makes a mean filter coffee.', values: ['alcohol-free', 'fitness', 'early mornings', 'coffee dates'], boundaries: ['no bar or pub dates', 'open to talking about recovery'], sensoryPrefs: ['outdoor spaces'], identityTags: ['sober 1-5 years'], commStyle: { prefersText: true, replyPace: 'same day', directness: 'high' }, lookingFor: 'long-term', likesDemo: true },
    { name: 'Meera', age: 27, city: 'Bengaluru', bio: 'Never drank, never missed it. Pottery on weekends.', values: ['alcohol-free', 'creativity', 'mindfulness', 'coffee dates'], boundaries: ['sober venues only'], sensoryPrefs: ['quiet places', 'small groups'], identityTags: ['never drank'], commStyle: { prefersText: true, replyPace: 'same day', directness: 'medium' }, lookingFor: 'long-term', likesDemo: true },
    { name: 'Kabir', age: 33, city: 'Pune', bio: 'Trekker, early riser, sober-curious and loving it.', values: ['sober-curious', 'outdoors', 'fitness'], boundaries: ['no drinking around me'], sensoryPrefs: ['outdoor spaces'], identityTags: ['sober-curious'], commStyle: { prefersText: false, replyPace: 'fast', directness: 'high' }, lookingFor: 'dating' },
    { name: 'Ishita', age: 31, city: 'Mumbai', bio: 'Yoga teacher. Five years in recovery and proud of it.', values: ['in recovery', 'mindfulness', 'faith'], boundaries: ['no substances at all', 'open to talking about recovery'], sensoryPrefs: ['quiet places'], identityTags: ['sober 5+ years'], commStyle: { prefersText: true, replyPace: 'slow', directness: 'medium' }, lookingFor: 'long-term' },
  ],
  eco: [
    { name: 'Ananya', age: 28, city: 'Bengaluru', bio: 'Climate analyst, balcony gardener, cycles everywhere.', values: ['vegan', 'climate action', 'cycling', 'gardening'], boundaries: ['vegan restaurants only'], sensoryPrefs: ['outdoor spaces'], identityTags: ['vegan', 'climate professional'], commStyle: { prefersText: true, replyPace: 'same day', directness: 'high' }, lookingFor: 'long-term', likesDemo: true },
    { name: 'Rohan', age: 30, city: 'Bengaluru', bio: 'Zero-waste kitchen, thrift-store fits, terrible puns.', values: ['zero-waste', 'thrifting', 'minimalism', 'local food'], boundaries: ['no fast fashion gifts'], sensoryPrefs: ['small groups'], identityTags: ['plant-based'], commStyle: { prefersText: true, replyPace: 'fast', directness: 'medium' }, lookingFor: 'dating', likesDemo: true },
    { name: 'Tara', age: 26, city: 'Chennai', bio: 'Animal shelter volunteer. Will judge your tote bag collection.', values: ['animal rights', 'vegan', 'minimalism'], boundaries: ['no zoos or animal shows', 'no meat at home'], sensoryPrefs: ['quiet places'], identityTags: ['activist'], commStyle: { prefersText: true, replyPace: 'slow', directness: 'high' }, lookingFor: 'long-term' },
    { name: 'Dev', age: 34, city: 'Hyderabad', bio: 'Farmer-market regular, trains over planes.', values: ['local food', 'climate action', 'vegetarian'], boundaries: ['no flying for short trips'], sensoryPrefs: ['outdoor spaces'], identityTags: ['vegetarian'], commStyle: { prefersText: false, replyPace: 'same day', directness: 'low' }, lookingFor: 'friendship' },
  ],
  neurodiverse: [
    { name: 'Nikhil', age: 30, city: 'Bengaluru', bio: 'Backend engineer. Can talk about trains for 3 hours. Will text, please don\'t call.', values: ['deep interests', 'tech', 'board games', 'honesty'], boundaries: ['no surprise calls', 'text before plans change'], sensoryPrefs: ['quiet places', 'predictable plans'], identityTags: ['autistic'], commStyle: { prefersText: true, replyPace: 'slow', directness: 'high' }, lookingFor: 'long-term', likesDemo: true },
    { name: 'Riya', age: 27, city: 'Bengaluru', bio: 'Illustrator with 40 open browser tabs and one very loved cat.', values: ['art', 'animals', 'music', 'deep interests'], boundaries: ['need time to recharge', 'no hidden meanings — say it directly'], sensoryPrefs: ['dim lighting', 'fidget-friendly'], identityTags: ['ADHD'], commStyle: { prefersText: true, replyPace: 'slow', directness: 'high' }, lookingFor: 'dating', likesDemo: true },
    { name: 'Arjun', age: 32, city: 'Delhi', bio: 'Librarian. Routines are my love language.', values: ['reading', 'routine', 'nature'], boundaries: ['need clear plans', 'quiet venues only'], sensoryPrefs: ['quiet places', 'small groups', 'no strong scents'], identityTags: ['AuDHD'], commStyle: { prefersText: true, replyPace: 'same day', directness: 'high' }, lookingFor: 'long-term' },
    { name: 'Sana', age: 25, city: 'Mumbai', bio: 'Game dev, dyslexic, voice notes > long texts.', values: ['tech', 'board games', 'music'], boundaries: ['no surprise calls'], sensoryPrefs: ['dim lighting'], identityTags: ['dyslexic'], commStyle: { prefersText: false, replyPace: 'fast', directness: 'medium' }, lookingFor: 'friendship' },
  ],
};

const demoUsers = {
  sober: { name: 'Demo Sober', age: 28, city: 'Bengaluru', bio: 'Demo account — sober community.', values: ['alcohol-free', 'coffee dates', 'fitness', 'mindfulness'], boundaries: ['no bar or pub dates', 'sober venues only'], sensoryPrefs: ['quiet places', 'outdoor spaces'], identityTags: ['sober 1-5 years'], commStyle: { prefersText: true, replyPace: 'same day', directness: 'high' }, lookingFor: 'long-term' },
  eco: { name: 'Demo Eco', age: 28, city: 'Bengaluru', bio: 'Demo account — eco community.', values: ['vegan', 'climate action', 'zero-waste', 'cycling'], boundaries: ['vegan restaurants only'], sensoryPrefs: ['outdoor spaces'], identityTags: ['vegan'], commStyle: { prefersText: true, replyPace: 'same day', directness: 'high' }, lookingFor: 'long-term' },
  neurodiverse: { name: 'Demo ND', age: 28, city: 'Bengaluru', bio: 'Demo account — neurodiverse community.', values: ['deep interests', 'tech', 'honesty', 'board games'], boundaries: ['no surprise calls', 'text before plans change'], sensoryPrefs: ['quiet places', 'predictable plans'], identityTags: ['ADHD'], commStyle: { prefersText: true, replyPace: 'slow', directness: 'high' }, lookingFor: 'long-term' },
};

function inDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(18, 0, 0, 0);
  return d;
}

const events = [
  { community: 'sober', title: 'Sunrise run + filter coffee', city: 'Bengaluru', venue: 'Cubbon Park', date: inDays(3), description: '5K easy run, then coffee. Zero alcohol, all welcome.', sponsor: 'Third Wave Coffee (demo sponsor)', featured: true },
  { community: 'sober', title: 'Mocktail mixology night', city: 'Bengaluru', venue: 'Indiranagar studio', date: inDays(9), description: 'Learn to make three zero-proof drinks.' },
  { community: 'eco', title: 'Beach clean-up & vegan potluck', city: 'Chennai', venue: 'Besant Nagar beach', date: inDays(5), description: 'Bring a dish, leave the beach cleaner than you found it.', sponsor: 'Bare Necessities (demo sponsor)', featured: true },
  { community: 'eco', title: 'Thrift swap social', city: 'Bengaluru', venue: 'HSR community hall', date: inDays(12), description: 'Swap clothes, books and plants.' },
  { community: 'neurodiverse', title: 'Quiet board-game evening', city: 'Bengaluru', venue: 'Koramangala game café (quiet room)', date: inDays(4), description: 'Low lighting, small tables, a clear agenda sent in advance. Leave whenever you like.', featured: true },
  { community: 'neurodiverse', title: 'Silent museum walk', city: 'Mumbai', venue: 'CSMVS', date: inDays(10), description: 'Walk at your own pace; chat after, only if you want to.' },
];

async function seed({ disconnect = true } = {}) {
  if (mongoose.connection.readyState !== 1) await mongoose.connect(env.mongoUri);

  await Promise.all([User.deleteMany({}), Like.deleteMany({}), Match.deleteMany({}), Message.deleteMany({}), Event.deleteMany({}), AdminLog.deleteMany({})]);
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const [community, list] of Object.entries(people)) {
    const demo = await User.create({
      email: `demo.${community}@kindred.app`,
      passwordHash,
      community,
      profile: demoUsers[community],
      profileComplete: true,
    });

    const created = [];
    for (const [i, p] of list.entries()) {
      const { likesDemo, ...profile } = p;
      const u = await User.create({
        email: `${p.name.toLowerCase()}.${community}@kindred.app`,
        passwordHash,
        community,
        profile,
        profileComplete: true,
        plan: i === 0 ? 'premium' : 'free',
        visibility: { identityTags: i % 2 === 0 ? 'everyone' : 'matches' },
      });
      created.push(u);
      // Spread signups over the last month and activity over the last week and a half.
      const offset = (created.length * 7 + community.length * 3) % 28;
      await backdate(User, u._id, daysAgo(offset + 2));
      await User.collection.updateOne({ _id: u._id }, { $set: { lastActiveAt: daysAgo(offset % 10, 2) } });
      if (likesDemo) await Like.create({ fromUser: u._id, toUser: demo._id, action: 'like' });
    }
    await seedHistory(created, community);
  }

  await Event.insertMany(events);
  await ensureDefaultAdmin();

  const counts = { users: await User.countDocuments(), likes: await Like.countDocuments(), matches: await Match.countDocuments(), events: await Event.countDocuments() };
  console.log('Seeded:', counts);
  console.log(`Demo logins (password ${PASSWORD}): demo.sober@kindred.app, demo.eco@kindred.app, demo.neurodiverse@kindred.app`);
  console.log(`Admin login: ${env.adminEmail} / ${env.adminPassword}`);

  if (disconnect) await mongoose.disconnect();
  return counts;
}

if (require.main === module) {
  seed().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { seed, PASSWORD };
