const express = require('express');
const router = express.Router();
const sosController = require('../controllers/sosController');
const sssController = require('../controllers/sssController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// ===== Traditional SOS Routes =====
// POST /api/sos - Trigger SOS alert
router.post('/', authenticateToken, sosController.triggerSOS);

// GET /api/sos - Get SOS alerts (admin only)
router.get('/', authenticateToken, isAdmin, sosController.getSOSAlerts);

// PUT /api/sos/:id - Resolve SOS alert (admin only)
router.put('/:id', authenticateToken, isAdmin, sosController.resolveSOSAlert);

// ===== Shamir's Secret Sharing Routes =====
// POST /api/sos/sss/configure - Configure SOS with SSS
router.post('/sss/configure', authenticateToken, sssController.configureSOS);

// GET /api/sos/sss/config - Get SSS configuration status
router.get('/sss/config', authenticateToken, sssController.getSOSConfig);

// POST /api/sos/sss/trigger - Trigger SOS with SSS reconstruction
router.post('/sss/trigger', authenticateToken, sssController.triggerSOSWithSSS);

// POST /api/sos/sss/provide-share - Provide share for reconstruction (trusted contact)
router.post('/sss/provide-share', sssController.provideShare);

// POST /api/sos/sss/demo - Demo SSS functionality
router.post('/sss/demo', authenticateToken, sssController.demoSSS);

module.exports = router;
