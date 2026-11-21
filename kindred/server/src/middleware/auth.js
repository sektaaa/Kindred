const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const COOKIE_NAME = 'kindred_token';

function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true, // not readable by JS -> protects against XSS token theft
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// Authentication: who are you? Accepts the httpOnly cookie or a Bearer token.
const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  const token = req.cookies?.[COOKIE_NAME] || (header?.startsWith('Bearer ') ? header.slice(7) : null);
  if (!token) throw new AppError('Please log in to continue', 401);

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new AppError('Session expired, please log in again', 401);
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new AppError('Account no longer exists', 401);
  if (user.status === 'suspended') throw new AppError('This account has been suspended', 403);

  // Activity tracking for analytics, written at most once every 5 minutes per user.
  const now = Date.now();
  if (!user.lastActiveAt || now - user.lastActiveAt.getTime() > 5 * 60 * 1000) {
    user.lastActiveAt = new Date(now);
    await User.updateOne({ _id: user._id }, { $set: { lastActiveAt: user.lastActiveAt } });
  }

  req.user = user;
  next();
});

// Authorization: admin panel routes.
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return next(new AppError('Admins only', 403));
  next();
};

// Regular dating features are for members, not admin accounts.
const requireMember = (req, res, next) => {
  if (req.user?.role === 'admin') return next(new AppError('Admin accounts cannot use dating features', 403));
  next();
};

// Authorization: discover / like / chat need a finished profile.
const requireCompleteProfile = (req, res, next) => {
  if (!req.user.profileComplete) {
    return next(new AppError('Complete your profile first', 403));
  }
  next();
};

module.exports = { requireAuth, requireCompleteProfile, requireAdmin, requireMember, signToken, setAuthCookie, COOKIE_NAME };
