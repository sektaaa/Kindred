const Like = require('../models/Like');
const User = require('../models/User');

// Weights for each compatibility signal. Tuned so that shared values and
// communication fit matter most — the things mainstream apps ignore.
const W = {
  sharedValue: 10,
  sharedBoundary: 6,
  sharedSensory: 5,
  replyPace: 10,
  directness: 8,
  prefersText: 5,
  lookingFor: 12,
};

/**
 * Builds the discover feed for `me`.
 * 1. Hard filters (Mongo $match): same community silo, finished profile,
 *    not me, not already swiped, nobody blocked in either direction.
 * 2. Soft scoring (Mongo $addFields): overlap of values/boundaries/sensory
 *    prefs via $setIntersection + communication-style equality checks.
 * 3. Explainability (JS): convert raw score to a 0-100 % and human reasons.
 */
async function getDiscoverFeed(me, { limit = 20 } = {}) {
  const swiped = await Like.find({ fromUser: me._id }).distinct('toUser');
  const excluded = [me._id, ...swiped, ...(me.blocked || [])];

  const p = me.profile || {};
  const cs = p.commStyle || {};
  const arr = (field) => ({ $ifNull: [`$profile.${field}`, []] });
  const eqInt = (a, b) => ({ $cond: [{ $eq: [a, b] }, 1, 0] });

  const pipeline = [
    {
      $match: {
        community: me.community,
        profileComplete: true,
        _id: { $nin: excluded },
        blocked: { $ne: me._id },
      },
    },
    {
      $addFields: {
        sharedValues: { $setIntersection: [arr('values'), p.values || []] },
        sharedBoundaries: { $setIntersection: [arr('boundaries'), p.boundaries || []] },
        sharedSensory: { $setIntersection: [arr('sensoryPrefs'), p.sensoryPrefs || []] },
        paceMatch: eqInt('$profile.commStyle.replyPace', cs.replyPace),
        directMatch: eqInt('$profile.commStyle.directness', cs.directness),
        textMatch: eqInt('$profile.commStyle.prefersText', cs.prefersText),
        goalMatch: eqInt('$profile.lookingFor', p.lookingFor),
      },
    },
    {
      $addFields: {
        rawScore: {
          $add: [
            { $multiply: [{ $size: '$sharedValues' }, W.sharedValue] },
            { $multiply: [{ $size: '$sharedBoundaries' }, W.sharedBoundary] },
            { $multiply: [{ $size: '$sharedSensory' }, W.sharedSensory] },
            { $multiply: ['$paceMatch', W.replyPace] },
            { $multiply: ['$directMatch', W.directness] },
            { $multiply: ['$textMatch', W.prefersText] },
            { $multiply: ['$goalMatch', W.lookingFor] },
          ],
        },
      },
    },
    { $sort: { rawScore: -1, createdAt: -1 } },
    { $limit: limit },
  ];

  const results = await User.aggregate(pipeline);
  const maxScore = maxPossibleScore(p);

  return results.map((u) => ({
    user: u,
    compatibility: Math.min(100, Math.round((u.rawScore / maxScore) * 100)),
    reasons: buildReasons(u),
  }));
}

function maxPossibleScore(p) {
  const max =
    (p.values?.length || 0) * W.sharedValue +
    (p.boundaries?.length || 0) * W.sharedBoundary +
    (p.sensoryPrefs?.length || 0) * W.sharedSensory +
    W.replyPace + W.directness + W.prefersText + W.lookingFor;
  return Math.max(max, 1);
}

// "Why you matched" — the demo moment. Plain-language, never a black box.
function buildReasons(u) {
  const reasons = [];
  if (u.sharedValues.length) reasons.push(`You both care about ${listify(u.sharedValues)}`);
  if (u.sharedBoundaries.length) reasons.push(`Same boundaries: ${listify(u.sharedBoundaries)}`);
  if (u.sharedSensory.length) reasons.push(`Both prefer ${listify(u.sharedSensory)}`);
  if (u.paceMatch) reasons.push(`Same reply pace (${u.profile.commStyle.replyPace})`);
  if (u.directMatch) reasons.push(`Same directness level (${u.profile.commStyle.directness})`);
  if (u.goalMatch) reasons.push(`Both looking for ${u.profile.lookingFor}`);
  return reasons;
}

function listify(items) {
  const list = items.slice(0, 3);
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

// Compatibility for a single pair (used when a match is created).
function scorePair(a, b) {
  const pa = a.profile || {};
  const pb = b.profile || {};
  const inter = (x = [], y = []) => x.filter((v) => y.includes(v)).length;
  const raw =
    inter(pa.values, pb.values) * W.sharedValue +
    inter(pa.boundaries, pb.boundaries) * W.sharedBoundary +
    inter(pa.sensoryPrefs, pb.sensoryPrefs) * W.sharedSensory +
    (pa.commStyle?.replyPace === pb.commStyle?.replyPace ? W.replyPace : 0) +
    (pa.commStyle?.directness === pb.commStyle?.directness ? W.directness : 0) +
    (pa.commStyle?.prefersText === pb.commStyle?.prefersText ? W.prefersText : 0) +
    (pa.lookingFor === pb.lookingFor ? W.lookingFor : 0);
  return Math.min(100, Math.round((raw / maxPossibleScore(pa)) * 100));
}

module.exports = { getDiscoverFeed, scorePair, WEIGHTS: W };
