const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(isAdmin);

// GET /api/admin/users - Get all users
router.get('/users', adminController.getAllUsers);

// GET /api/admin/rides - Get all rides
router.get('/rides', adminController.getAllRides);

// PUT /api/admin/users/:userId/ban - Ban/Unban user
router.put('/users/:userId/ban', adminController.toggleUserBan);

// GET /api/admin/stats - Get dashboard statistics
router.get('/stats', adminController.getDashboardStats);

// POST /api/admin/merkle/anchor - Anchor completed rides to blockchain
router.post('/merkle/anchor', adminController.anchorMerkleRoot);

// GET /api/admin/merkle/proof/:rideId - Get Merkle proof for a ride
router.get('/merkle/proof/:rideId', adminController.getMerkleProof);

// POST /api/admin/merkle/verify - Verify Merkle proof on-chain
router.post('/merkle/verify', adminController.verifyMerkleProof);

// ===== CP-ABE Demo Routes =====
// POST /api/admin/cpabe/encrypt - Encrypt data with policy
router.post('/cpabe/encrypt', adminController.cpabeEncrypt);

// POST /api/admin/cpabe/decrypt - Decrypt data with secret key
router.post('/cpabe/decrypt', adminController.cpabeDecrypt);

// POST /api/admin/cpabe/keygen - Generate key with attributes
router.post('/cpabe/keygen', adminController.cpabeKeygen);

// GET /api/admin/cpabe/rides - Get rides with encrypted fields
router.get('/cpabe/rides', adminController.getRidesWithEncryption);

module.exports = router;
