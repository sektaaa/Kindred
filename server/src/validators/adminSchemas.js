const { z } = require('zod');
const { COMMUNITIES, COMMUNITY_KEYS, SENSORY_PREFS, REPLY_PACE, DIRECTNESS } = require('../config/communities');

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Za-z]/, 'Password needs a letter')
  .regex(/\d/, 'Password needs a number');

const createAdminSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(50),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password,
});

const resetPasswordSchema = z.object({ password });

const roleSchema = z.object({ role: z.enum(['user', 'admin']) });

const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  currentPassword: z.string().optional(),
  newPassword: password.optional(),
}).refine((d) => !d.newPassword || d.currentPassword, { message: 'Current password is required to set a new one', path: ['currentPassword'] });

// Admin edits to a member. Profile options are checked against the member's
// (possibly new) community so the data stays consistent with the matching engine.
function adminUserUpdateSchemaFor(community) {
  const c = COMMUNITIES[community];
  const pick = (list, max) => z.array(z.enum(list)).max(max);
  return z.object({
    email: z.string().trim().toLowerCase().email().optional(),
    community: z.enum(COMMUNITY_KEYS).optional(),
    plan: z.enum(['free', 'premium']).optional(),
    status: z.enum(['active', 'suspended']).optional(),
    visibility: z.object({ identityTags: z.enum(['everyone', 'matches', 'nobody']) }).optional(),
    profile: z
      .object({
        name: z.string().trim().min(1).max(50).optional(),
        age: z.coerce.number().int().min(18).max(100).optional(),
        city: z.string().trim().min(1).max(60).optional(),
        bio: z.string().trim().max(500).optional(),
        photoUrl: z.string().trim().url().optional().or(z.literal('')),
        lookingFor: z.enum(['friendship', 'dating', 'long-term']).optional(),
        values: c ? pick(c.values, 8).optional() : z.array(z.string()).max(0).optional(),
        boundaries: c ? pick(c.boundaries, 6).optional() : z.array(z.string()).max(0).optional(),
        identityTags: c ? pick(c.identityTags, 3).optional() : z.array(z.string()).max(0).optional(),
        sensoryPrefs: pick(SENSORY_PREFS, 7).optional(),
        commStyle: z
          .object({
            prefersText: z.boolean().optional(),
            replyPace: z.enum(REPLY_PACE).optional(),
            directness: z.enum(DIRECTNESS).optional(),
          })
          .optional(),
      })
      .optional(),
  });
}

const userListQuery = z.object({
  search: z.string().trim().max(100).optional(),
  community: z.enum(COMMUNITY_KEYS).optional(),
  plan: z.enum(['free', 'premium']).optional(),
  status: z.enum(['active', 'suspended']).optional(),
  role: z.enum(['user', 'admin']).optional(),
  profile: z.enum(['complete', 'incomplete']).optional(),
  sort: z.enum(['newest', 'oldest', 'active', 'name']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const statsQuery = z.object({ days: z.coerce.number().int().min(7).max(365).default(30) });

const eventSchema = z.object({
  community: z.enum(COMMUNITY_KEYS),
  title: z.string().trim().min(1, 'Title is required').max(120),
  description: z.string().trim().max(1000).optional().default(''),
  city: z.string().trim().max(60).optional().default(''),
  venue: z.string().trim().max(120).optional().default(''),
  date: z.coerce.date({ errorMap: () => ({ message: 'Enter a valid date' }) }),
  sponsor: z.string().trim().max(120).optional().default(''),
  featured: z.boolean().optional().default(false),
});

module.exports = {
  createAdminSchema,
  resetPasswordSchema,
  roleSchema,
  updateMeSchema,
  adminUserUpdateSchemaFor,
  userListQuery,
  statsQuery,
  eventSchema,
  eventUpdateSchema: eventSchema.partial(),
};
