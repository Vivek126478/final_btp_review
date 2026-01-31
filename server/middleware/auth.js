const { User } = require('../models');

const authenticateToken = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'User is banned' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Authentication failed' });
  }
};

const optionalAuthenticateToken = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      req.user = null;
      return next();
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'User is banned' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Authentication failed' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { authenticateToken, optionalAuthenticateToken, isAdmin };
