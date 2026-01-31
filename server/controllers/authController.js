const { User, EmailVerification } = require('../models');
const bcrypt = require('bcryptjs');

const isAllowedEmail = (email) => {
  const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN || '@iiitkottayam.ac.in';
  return typeof email === 'string' && email.endsWith(allowedDomain);
};

// Check if email exists (for routing logic)
exports.checkEmail = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!isAllowedEmail(email)) {
      return res.status(400).json({ error: 'Only @iiitkottayam.ac.in emails are allowed' });
    }

    const user = await User.findOne({ where: { email } });

    res.json({ 
      exists: !!user,
      email 
    });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ error: 'Failed to check email' });
  }
};

// Signup - Register new user
exports.signup = async (req, res) => {
  try {
    const { username, email, password, phoneNumber, gender, bio } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (!isAllowedEmail(email)) {
      return res.status(400).json({ error: 'Only @iiitkottayam.ac.in emails are allowed' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if email is verified
    const verification = await EmailVerification.findOne({
      where: { email, isVerified: true }
    });

    if (!verification) {
      return res.status(400).json({ 
        error: 'Email not verified. Please verify your email first.',
        requiresVerification: true
      });
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      if (existingUser.username === username) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user without wallet address
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      phoneNumber: phoneNumber || null,
      gender: gender || null,
      bio: bio || null
    });

    // Delete verification record after successful registration
    await EmailVerification.destroy({ where: { email } });

    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        gender: user.gender,
        bio: user.bio,
        profilePicture: user.profilePicture,
        role: user.role,
        isActive: user.isActive,
        isBanned: user.isBanned
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Login - Authenticate existing user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!isAllowedEmail(email)) {
      return res.status(400).json({ error: 'Only @iiitkottayam.ac.in emails are allowed' });
    }

    // Find user by email
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user is banned
    if (user.isBanned) {
      return res.status(403).json({ error: 'Your account has been banned' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        gender: user.gender,
        bio: user.bio,
        profilePicture: user.profilePicture,
        role: user.role,
        isActive: user.isActive,
        isBanned: user.isBanned
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['createdAt', 'updatedAt'] }
    });

    res.json({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { username, email, phoneNumber, bio, profilePicture, ipfsHash } = req.body;
    const user = req.user;

    // Check if username is taken by another user
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    // Check if email is taken by another user
    if (email && email !== user.email) {
      if (!isAllowedEmail(email)) {
        return res.status(400).json({ error: 'Only @iiitkottayam.ac.in emails are allowed' });
      }
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already taken' });
      }
    }

    // Update user
    await user.update({
      username: username || user.username,
      email: email || user.email,
      phoneNumber: phoneNumber !== undefined ? phoneNumber : user.phoneNumber,
      bio: bio !== undefined ? bio : user.bio,
      profilePicture: profilePicture !== undefined ? profilePicture : user.profilePicture,
      ipfsHash: ipfsHash !== undefined ? ipfsHash : user.ipfsHash
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        bio: user.bio,
        profilePicture: user.profilePicture,
        ipfsHash: user.ipfsHash
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};
