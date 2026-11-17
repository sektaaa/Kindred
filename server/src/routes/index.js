const express = require('express');
const rateLimit = require('express-rate-limit');
const a = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { requireAuth, requireCompleteProfile, requireAdmin, requireMember } = require('../middleware/auth');
const { signupSchema, loginSchema, swipeSchema, messageSchema, idParam } = require('../validators/schemas');
const adminSchemas = require('../validators/adminSchemas');

const auth = require('../controllers/authController');
const profile = require('../controllers/profileController');
const discover = require('../controllers/discoverController');
const match = require('../controllers/matchController');
const admin = require('../controllers/adminController');

const router = express.Router();

// Brute-force protection on auth endpoints.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false });

// ---- Public
router.get('/health', (req, res) => res.json({ success: true, status: 'ok' }));
router.get('/meta/options', profile.options);
router.post('/auth/signup', authLimiter, validate(signupSchema), a(auth.signup));
router.post('/auth/login', authLimiter, validate(loginSchema), a(auth.login));
router.post('/auth/logout', auth.logout);

// ---- Authenticated (members and admins)
router.use(requireAuth);
router.get('/auth/me', auth.me);

// ---- Admin panel: every route needs role = admin
const adminRouter = express.Router();
adminRouter.use(requireAdmin);
adminRouter.get('/stats/overview', a(admin.overview));
adminRouter.get('/stats/timeseries', validate(adminSchemas.statsQuery, 'query'), a(admin.timeseries));

adminRouter.get('/users', validate(adminSchemas.userListQuery, 'query'), a(admin.listUsers));
adminRouter.get('/users/:id', validate(idParam, 'params'), a(admin.getUser));
adminRouter.patch('/users/:id', validate(idParam, 'params'), a(admin.updateUser));
adminRouter.post('/users/:id/password', validate(idParam, 'params'), validate(adminSchemas.resetPasswordSchema), a(admin.resetPassword));
adminRouter.post('/users/:id/role', validate(idParam, 'params'), validate(adminSchemas.roleSchema), a(admin.setRole));
adminRouter.delete('/users/:id', validate(idParam, 'params'), a(admin.deleteUser));

adminRouter.get('/admins', a(admin.listAdmins));
adminRouter.post('/admins', validate(adminSchemas.createAdminSchema), a(admin.createAdmin));
adminRouter.patch('/me', validate(adminSchemas.updateMeSchema), a(admin.updateMe));

adminRouter.get('/events', a(admin.listEvents));
adminRouter.post('/events', validate(adminSchemas.eventSchema), a(admin.createEvent));
adminRouter.patch('/events/:id', validate(idParam, 'params'), validate(adminSchemas.eventUpdateSchema), a(admin.updateEvent));
adminRouter.delete('/events/:id', validate(idParam, 'params'), a(admin.deleteEvent));

adminRouter.get('/logs', a(admin.logs));
router.use('/admin', adminRouter);

// ---- Members only (admin accounts don't date)
router.use(requireMember);
router.put('/profile/me', a(profile.updateMyProfile));
router.post('/profile/me/upgrade', a(profile.upgrade));

// ---- Members with a finished profile
router.use(requireCompleteProfile);
router.get('/profile/:id', validate(idParam, 'params'), a(profile.getProfile));
router.post('/profile/:id/block', validate(idParam, 'params'), a(profile.blockUser));

router.get('/discover', a(discover.discover));
router.post('/swipes', validate(swipeSchema), a(discover.swipe));
router.get('/likes/received', a(discover.likesReceived));

router.get('/matches', a(match.listMatches));
router.delete('/matches/:id', validate(idParam, 'params'), a(match.unmatch));
router.get('/matches/:id/messages', validate(idParam, 'params'), a(match.getMessages));
router.post('/matches/:id/messages', validate(idParam, 'params'), validate(messageSchema), a(match.sendMessage));

router.get('/events', a(match.listEvents));

module.exports = router;
