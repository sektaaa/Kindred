const express = require('express');
const rateLimit = require('express-rate-limit');
const a = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { requireAuth, requireCompleteProfile } = require('../middleware/auth');
const { signupSchema, loginSchema, swipeSchema, messageSchema, idParam } = require('../validators/schemas');

const auth = require('../controllers/authController');
const profile = require('../controllers/profileController');
const discover = require('../controllers/discoverController');
const match = require('../controllers/matchController');

const router = express.Router();

// Brute-force protection on auth endpoints.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false });

// ---- Public
router.get('/health', (req, res) => res.json({ success: true, status: 'ok' }));
router.get('/meta/options', profile.options);
router.post('/auth/signup', authLimiter, validate(signupSchema), a(auth.signup));
router.post('/auth/login', authLimiter, validate(loginSchema), a(auth.login));
router.post('/auth/logout', auth.logout);

// ---- Authenticated
router.use(requireAuth);
router.get('/auth/me', auth.me);
router.put('/profile/me', a(profile.updateMyProfile));
router.post('/profile/me/upgrade', a(profile.upgrade));

// ---- Authenticated + finished profile
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
