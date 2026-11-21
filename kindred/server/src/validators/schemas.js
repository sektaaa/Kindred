const { z } = require('zod');
const { COMMUNITIES, COMMUNITY_KEYS, SENSORY_PREFS, INTERESTS, REPLY_PACE, DIRECTNESS } = require('../config/communities');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Password needs a letter')
    .regex(/\d/, 'Password needs a number'),
  community: z.enum(COMMUNITY_KEYS),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, 'Password is required'),
});

// Profile options depend on the user's community, so the schema is built per request.
function profileSchemaFor(community) {
  const c = COMMUNITIES[community];
  const pick = (list, max) => z.array(z.enum(list)).max(max).default([]);
  return z.object({
    name: z.string().trim().min(1, 'Name is required').max(50),
    age: z.coerce.number().int().min(18, 'You must be 18+').max(100),
    city: z.string().trim().min(1, 'City is required').max(60),
    bio: z.string().trim().max(500).default(''),
    photoUrl: z.string().trim().url().optional().or(z.literal('')),
    values: pick(c.values, 8),
    boundaries: pick(c.boundaries, 6),
    sensoryPrefs: pick(SENSORY_PREFS, 7),
    interests: pick(INTERESTS, 10),
    identityTags: pick(c.identityTags, 3),
    commStyle: z
      .object({
        prefersText: z.boolean().default(true),
        replyPace: z.enum(REPLY_PACE).default('same day'),
        directness: z.enum(DIRECTNESS).default('medium'),
      })
      .default({}),
    lookingFor: z.enum(['friendship', 'dating', 'long-term']).default('dating'),
    visibility: z.object({ identityTags: z.enum(['everyone', 'matches', 'nobody']) }).optional(),
  });
}

const swipeSchema = z.object({
  toUser: objectId,
  action: z.enum(['like', 'pass']),
});

const messageSchema = z.object({
  text: z.string().trim().min(1, 'Message cannot be empty').max(2000),
});

const idParam = z.object({ id: objectId });

// ---- Events
const eventListQuery = z.object({
  search: z.string().trim().max(100).optional(),
  when: z.enum(['upcoming', 'past', 'all']).default('upcoming'),
  community: z.enum(COMMUNITY_KEYS).optional(),
});
const rsvpSchema = z.object({ rsvp: z.enum(['going', 'interested', 'not_going']) });
const reactionSchema = z.object({ value: z.enum(['like', 'dislike', 'none']) });
const eventCommentSchema = z.object({
  text: z.string().trim().min(1, 'Write something first').max(1000),
  kind: z.enum(['general', 'liked', 'improve']).default('general'),
});
const attendanceSchema = z.object({ userId: objectId, attendance: z.enum(['attended', 'no_show', 'pending']) });
const commentParams = z.object({ id: objectId, commentId: objectId });
const photoParams = z.object({ id: objectId, photoId: objectId });

module.exports = {
  signupSchema, loginSchema, profileSchemaFor, swipeSchema, messageSchema, idParam, objectId,
  eventListQuery, rsvpSchema, reactionSchema, eventCommentSchema, attendanceSchema, commentParams, photoParams,
};
