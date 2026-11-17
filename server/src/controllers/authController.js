const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { signToken, setAuthCookie, COOKIE_NAME } = require('../middleware/auth');
const { privateUser } = require('../services/serialize');

exports.signup = async (req, res) => {
  const { email, password, community } = req.body;
  if (await User.exists({ email })) throw new AppError('An account with this email already exists', 409);

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ email, passwordHash, community });

  const token = signToken(user._id);
  setAuthCookie(res, token);
  res.status(201).json({ success: true, data: { user: privateUser(user), token } });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  // Same message for both cases so attackers can't discover which emails exist.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError('Incorrect email or password', 401);
  }
  if (user.status === 'suspended') throw new AppError('This account has been suspended', 403);
  const token = signToken(user._id);
  setAuthCookie(res, token);
  res.json({ success: true, data: { user: privateUser(user), token } });
};

exports.logout = (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ success: true, message: 'Logged out' });
};

exports.me = (req, res) => {
  res.json({ success: true, data: { user: privateUser(req.user) } });
};
