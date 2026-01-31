const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');

// POST /api/rides - Create a new ride
router.post('/', authenticateToken, rideController.createRide);

// GET /api/rides/search - Search rides with filters
router.get('/search', optionalAuthenticateToken, rideController.searchRides);

// POST /api/rides/search-alerts - Save search filters for email notifications
router.post('/search-alerts', authenticateToken, rideController.createRideSearchAlert);

// GET /api/rides/user - Get user's rides
router.get('/user', authenticateToken, rideController.getUserRides);

// POST /api/rides/:id/application/cancel - Rider withdraws a pending application
router.post('/:id/application/cancel', authenticateToken, rideController.cancelRideApplication);

// POST /api/rides/:id/hide - Hide a ride from your dashboard/finder
router.post('/:id/hide', authenticateToken, rideController.hideRide);

// POST /api/rides/:id/unhide - Unhide a ride
router.post('/:id/unhide', authenticateToken, rideController.unhideRide);

// GET /api/rides/:id - Get ride by ID
router.get('/:id', optionalAuthenticateToken, rideController.getRideById);

// PUT /api/rides/:id - Update ride details (driver only)
router.put('/:id', authenticateToken, rideController.updateRide);

// POST /api/rides/:id/invite - Invite by email/phone (host anytime; accepted riders after acceptance)
router.post('/:id/invite', authenticateToken, rideController.inviteToRide);

// POST /api/rides/:id/publish - Publish a draft ride
router.post('/:id/publish', authenticateToken, rideController.publishDraftRide);

// POST /api/rides/:id/join - Join a ride
router.post('/:id/join', authenticateToken, rideController.joinRide);

// Host-local blocklist per ride/host
router.post('/:id/block/:riderId', authenticateToken, rideController.blockRider);
router.post('/:id/unblock/:riderId', authenticateToken, rideController.unblockRider);

// Boarding OTP verification (host only)
router.post('/:id/boarding/start', authenticateToken, rideController.startRideBoardingOTP);
router.get('/:id/boarding/status', authenticateToken, rideController.getRideBoardingStatus);
router.post('/:id/boarding/verify', authenticateToken, rideController.verifyRidePassengerOTP);

// POST /api/rides/:id/participants/:participantId/accept - Accept a join request (driver only)
router.post('/:id/participants/:participantId/accept', authenticateToken, rideController.acceptJoinRequest);

// POST /api/rides/:id/participants/:participantId/reject - Reject a join request (driver only)
router.post('/:id/participants/:participantId/reject', authenticateToken, rideController.rejectJoinRequest);

// POST /api/rides/:id/leave - Leave a ride
router.post('/:id/leave', authenticateToken, rideController.leaveRide);

// POST /api/rides/:id/cancel - Cancel a ride
router.post('/:id/cancel', authenticateToken, rideController.cancelRide);

// POST /api/rides/:id/complete - Complete a ride
router.post('/:id/complete', authenticateToken, rideController.completeRide);

module.exports = router;
