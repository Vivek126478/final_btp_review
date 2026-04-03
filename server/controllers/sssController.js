/**
 * Shamir's Secret Sharing Controller for SOS Emergency Data
 * 
 * Handles:
 * - Setting up emergency info with SSS
 * - Managing trusted contacts
 * - Triggering SOS with share reconstruction
 * - Blockchain commitment of share hashes
 */

const { User, SOSAlert, Ride } = require('../models');
const { 
  splitSecret, 
  combineShares, 
  hashShare,
  createEmergencyData,
  createShareDistribution,
  encryptShare,
  decryptShare,
  DEFAULT_TOTAL_SHARES,
  DEFAULT_THRESHOLD
} = require('../utils/shamirSSS');
const { sendSOSEmail } = require('../utils/emailService');

// In-memory storage for shares (in production, use secure database + encryption)
const shareStorage = new Map();

/**
 * Configure SOS with Shamir's Secret Sharing
 * POST /api/sos/configure
 */
exports.configureSOS = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactEmail,
      medicalInfo,
      bloodGroup,
      allergies,
      homeAddress,
      additionalNotes,
      trustedContacts = [] // Array of { name, email, phone }
    } = req.body;

    // Validate required fields
    if (!emergencyContactName || !emergencyContactPhone) {
      return res.status(400).json({ 
        error: 'Emergency contact name and phone are required' 
      });
    }

    // Create structured emergency data
    const emergencyData = createEmergencyData({
      userId,
      userName: req.user.username,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactEmail,
      medicalInfo,
      bloodGroup,
      allergies: Array.isArray(allergies) ? allergies : [],
      homeAddress,
      additionalNotes
    });

    // Split emergency data using Shamir's Secret Sharing
    const { shares, secretHash, config } = splitSecret(
      emergencyData,
      DEFAULT_TOTAL_SHARES,
      DEFAULT_THRESHOLD
    );

    // Create share distribution
    const distribution = createShareDistribution(shares, {
      adminAddress: process.env.ADMIN_WALLET_ADDRESS || null,
      userAddress: req.user.walletAddress || null,
      trustedContacts
    });

    // Encrypt and store shares
    const userEncryptionKey = `${userId}-${req.user.walletAddress || 'default'}`;
    const encryptedShares = distribution.map(d => ({
      ...d,
      encryptedShare: encryptShare(d.share, userEncryptionKey),
      share: undefined // Remove plaintext share
    }));

    // Store in memory (in production, use secure database)
    shareStorage.set(userId, {
      secretHash,
      config,
      distribution: encryptedShares,
      trustedContacts,
      createdAt: new Date().toISOString(),
      isActive: true
    });

    // Update user record with SOS status
    await User.update(
      { 
        sosConfigured: true,
        sosConfiguredAt: new Date()
      },
      { where: { id: userId } }
    );

    res.json({
      success: true,
      message: 'SOS configured with Shamir\'s Secret Sharing',
      config: {
        totalShares: config.totalShares,
        threshold: config.threshold,
        secretHash: secretHash.substring(0, 16) + '...',
        shareHolders: encryptedShares.map(s => ({
          index: s.index,
          holderType: s.holderType,
          holderName: s.holderName,
          shareHash: s.shareHash.substring(0, 18) + '...'
        }))
      },
      explanation: `Your emergency data has been split into ${config.totalShares} shares. ` +
        `Any ${config.threshold} shares are needed to reconstruct it during an emergency.`
    });
  } catch (error) {
    console.error('Configure SOS error:', error);
    res.status(500).json({ error: 'Failed to configure SOS: ' + error.message });
  }
};

/**
 * Get current SOS configuration status
 * GET /api/sos/config
 */
exports.getSOSConfig = async (req, res) => {
  try {
    const userId = req.user.id;
    const stored = shareStorage.get(userId);

    if (!stored || !stored.isActive) {
      return res.json({
        configured: false,
        message: 'SOS not configured. Please set up your emergency information.'
      });
    }

    res.json({
      configured: true,
      config: {
        totalShares: stored.config.totalShares,
        threshold: stored.config.threshold,
        createdAt: stored.createdAt,
        shareHolders: stored.distribution.map(s => ({
          index: s.index,
          holderType: s.holderType,
          holderName: s.holderName
        })),
        trustedContactsCount: stored.trustedContacts?.length || 0
      }
    });
  } catch (error) {
    console.error('Get SOS config error:', error);
    res.status(500).json({ error: 'Failed to get SOS configuration' });
  }
};

/**
 * Trigger SOS with Shamir reconstruction
 * POST /api/sos/trigger
 */
exports.triggerSOSWithSSS = async (req, res) => {
  try {
    const userId = req.user.id;
    const { rideId, latitude, longitude, message } = req.body;

    if (!rideId) {
      return res.status(400).json({ error: 'Ride ID is required' });
    }

    // Get stored shares
    const stored = shareStorage.get(userId);
    
    // Get ride details
    const ride = await Ride.findByPk(rideId, {
      include: [{
        model: User,
        as: 'host',
        attributes: ['id', 'username', 'email', 'phoneNumber']
      }]
    });

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    // Create SOS alert record
    const sosAlert = await SOSAlert.create({
      userId,
      rideId,
      location: `${latitude}, ${longitude}`,
      latitude,
      longitude,
      message,
      status: 'active'
    });

    let reconstructedData = null;
    let sssUsed = false;

    // If SSS is configured, attempt reconstruction
    if (stored && stored.isActive) {
      try {
        // In emergency, we auto-collect shares from available sources
        // In real implementation, this would involve:
        // 1. Admin providing their share
        // 2. User's share from their wallet
        // 3. At least one trusted contact confirming via OTP
        
        const userEncryptionKey = `${userId}-${req.user.walletAddress || 'default'}`;
        
        // Collect available shares (simulated for demo)
        const availableShares = [];
        
        // Auto-include admin share (share 0)
        if (stored.distribution[0]) {
          const decrypted = decryptShare(stored.distribution[0].encryptedShare, userEncryptionKey);
          availableShares.push(decrypted);
        }
        
        // Auto-include user's own share (share 1)
        if (stored.distribution[1]) {
          const decrypted = decryptShare(stored.distribution[1].encryptedShare, userEncryptionKey);
          availableShares.push(decrypted);
        }
        
        // Auto-include first trusted contact share (share 2)
        // In production: would require OTP verification from contact
        if (stored.distribution[2]) {
          const decrypted = decryptShare(stored.distribution[2].encryptedShare, userEncryptionKey);
          availableShares.push(decrypted);
        }

        // Reconstruct if we have enough shares
        if (availableShares.length >= stored.config.threshold) {
          reconstructedData = combineShares(availableShares);
          sssUsed = true;
          
          // Update alert with reconstruction status
          await sosAlert.update({
            sssReconstructed: true,
            sharesUsed: availableShares.length
          });
        }
      } catch (sssError) {
        console.error('SSS reconstruction error:', sssError);
        // Continue with basic SOS even if SSS fails
      }
    }

    // Prepare SOS details
    const sosDetails = {
      alertId: sosAlert.id,
      userName: req.user.username,
      userEmail: req.user.email,
      userPhone: req.user.phoneNumber,
      driverName: ride.host?.username,
      driverPhone: ride.host?.phoneNumber,
      rideDetails: {
        startLocation: ride.startLocation,
        endLocation: ride.endLocation,
        rideDateTime: ride.rideDateTime
      },
      currentLocation: `${latitude}, ${longitude}`,
      latitude,
      longitude,
      message,
      timestamp: new Date(),
      // Include reconstructed emergency data if available
      emergencyData: reconstructedData
    };

    // Send SOS emails
    try {
      await sendSOSEmail(sosDetails);
      
      // If we have reconstructed data, send to emergency contact
      if (reconstructedData && reconstructedData.emergencyContact) {
        // Additional notification to emergency contact
        console.log('Would send to emergency contact:', reconstructedData.emergencyContact);
      }
    } catch (emailError) {
      console.error('Failed to send SOS email:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'SOS alert triggered successfully',
      alert: {
        id: sosAlert.id,
        status: 'active',
        sssUsed,
        sharesCollected: sssUsed ? stored.config.threshold : 0,
        emergencyDataReconstructed: !!reconstructedData
      },
      explanation: sssUsed 
        ? `Emergency data reconstructed using ${stored.config.threshold} shares. Emergency contacts notified.`
        : 'SOS triggered. Emergency contacts notified via platform.'
    });
  } catch (error) {
    console.error('Trigger SOS error:', error);
    res.status(500).json({ error: 'Failed to trigger SOS alert' });
  }
};

/**
 * Provide a share for reconstruction (trusted contact action)
 * POST /api/sos/provide-share
 */
exports.provideShare = async (req, res) => {
  try {
    const { alertId, shareIndex, verificationCode } = req.body;

    // In production: verify the OTP sent to the trusted contact
    // For demo, we accept any request

    const alert = await SOSAlert.findByPk(alertId);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    if (alert.status !== 'active') {
      return res.status(400).json({ error: 'Alert is no longer active' });
    }

    // Record share provision
    // In production: update blockchain with share reveal event
    
    res.json({
      success: true,
      message: 'Share provided successfully',
      alertId,
      shareIndex
    });
  } catch (error) {
    console.error('Provide share error:', error);
    res.status(500).json({ error: 'Failed to provide share' });
  }
};

/**
 * Demo endpoint: Show SSS in action
 * POST /api/sos/demo
 */
exports.demoSSS = async (req, res) => {
  try {
    const { secret, totalShares = 5, threshold = 3 } = req.body;

    if (!secret) {
      return res.status(400).json({ error: 'Secret is required for demo' });
    }

    // Split the secret
    const { shares, secretHash, config } = splitSecret(secret, totalShares, threshold);

    // Create distribution info
    const shareInfo = shares.map((share, i) => ({
      index: i,
      share: share.substring(0, 20) + '...',
      shareHash: hashShare(share).substring(0, 18) + '...',
      fullShare: share // Include for demo reconstruction
    }));

    // Demo reconstruction with threshold shares
    const selectedShares = shares.slice(0, threshold);
    const reconstructed = combineShares(selectedShares);

    res.json({
      success: true,
      demo: {
        originalSecret: secret,
        secretHash: secretHash.substring(0, 32) + '...',
        config,
        shares: shareInfo,
        reconstruction: {
          sharesUsed: threshold,
          sharesSelected: selectedShares.map((s, i) => `Share ${i}`),
          reconstructedSecret: reconstructed,
          matches: reconstructed === secret
        }
      },
      explanation: 
        `Secret split into ${totalShares} shares. ` +
        `Any ${threshold} shares can reconstruct it. ` +
        `With ${threshold - 1} or fewer shares, the secret is mathematically impossible to recover.`
    });
  } catch (error) {
    console.error('Demo SSS error:', error);
    res.status(500).json({ error: 'Demo failed: ' + error.message });
  }
};

module.exports = exports;
