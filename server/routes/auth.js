const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// GET /api/auth/check-email - Check if email exists
router.get('/check-email', authController.checkEmail);

// POST /api/auth/signup - Register new user
router.post('/signup', authController.signup);

// POST /api/auth/login - Login existing user
router.post('/login', authController.login);

// GET /api/auth/me - Get current user
router.get('/me', authenticateToken, authController.getCurrentUser);

// PUT /api/auth/profile - Update user profile
router.put('/profile', authenticateToken, authController.updateProfile);

// POST /api/auth/mint-sbt - Mint SBT for academic identity
router.post('/mint-sbt', authenticateToken, authController.mintStudentSBT);

module.exports = router;
