/**
 * Shamir's Secret Sharing Utility for SOS Emergency Data
 * 
 * This module provides functions to:
 * - Split emergency data into N shares using Shamir's algorithm
 * - Reconstruct the original data from K shares (threshold)
 * - Generate share hashes for blockchain commitment
 * 
 * Security: Information-theoretic security - K-1 shares reveal zero information
 */

const secrets = require('secrets.js-grempe');
const crypto = require('crypto');

// Default configuration
const DEFAULT_TOTAL_SHARES = 5;
const DEFAULT_THRESHOLD = 3;

/**
 * Split a secret into multiple shares using Shamir's Secret Sharing
 * @param {string|object} secretData - The secret to split (string or object)
 * @param {number} totalShares - Total number of shares to create (N)
 * @param {number} threshold - Minimum shares needed to reconstruct (K)
 * @returns {object} - { shares: string[], secretHash: string, config: object }
 */
function splitSecret(secretData, totalShares = DEFAULT_TOTAL_SHARES, threshold = DEFAULT_THRESHOLD) {
  if (threshold > totalShares) {
    throw new Error('Threshold cannot exceed total shares');
  }
  if (threshold < 2) {
    throw new Error('Threshold must be at least 2');
  }
  if (totalShares < 2) {
    throw new Error('Need at least 2 shares');
  }

  // Convert to string if object
  const secretString = typeof secretData === 'object' 
    ? JSON.stringify(secretData) 
    : String(secretData);

  // Convert secret to hex
  const secretHex = secrets.str2hex(secretString);

  // Split into shares
  const shares = secrets.share(secretHex, totalShares, threshold);

  // Generate hash of original secret for verification
  const secretHash = crypto.createHash('sha256').update(secretString).digest('hex');

  return {
    shares,
    secretHash,
    config: {
      totalShares,
      threshold,
      algorithm: 'shamir-secret-sharing',
      createdAt: new Date().toISOString()
    }
  };
}

/**
 * Reconstruct secret from shares
 * @param {string[]} shares - Array of shares (at least threshold number)
 * @returns {string} - Reconstructed secret
 */
function combineShares(shares) {
  if (!Array.isArray(shares) || shares.length < 2) {
    throw new Error('Need at least 2 shares to reconstruct');
  }

  try {
    const secretHex = secrets.combine(shares);
    const secretString = secrets.hex2str(secretHex);
    
    // Try to parse as JSON
    try {
      return JSON.parse(secretString);
    } catch {
      return secretString;
    }
  } catch (error) {
    throw new Error('Failed to reconstruct secret: ' + error.message);
  }
}

/**
 * Generate hash of a share for blockchain commitment
 * @param {string} share - The share to hash
 * @returns {string} - SHA256 hash of the share (prefixed with 0x for Solidity)
 */
function hashShare(share) {
  const hash = crypto.createHash('sha256').update(share).digest('hex');
  return '0x' + hash;
}

/**
 * Verify a share against its hash
 * @param {string} share - The share to verify
 * @param {string} expectedHash - The expected hash (with or without 0x prefix)
 * @returns {boolean}
 */
function verifyShareHash(share, expectedHash) {
  const computed = hashShare(share);
  const normalized = expectedHash.startsWith('0x') ? expectedHash : '0x' + expectedHash;
  return computed.toLowerCase() === normalized.toLowerCase();
}

/**
 * Create SOS emergency data structure
 * @param {object} params - Emergency data parameters
 * @returns {object} - Structured emergency data
 */
function createEmergencyData({
  userId,
  userName,
  emergencyContactName,
  emergencyContactPhone,
  emergencyContactEmail,
  medicalInfo,
  bloodGroup,
  allergies,
  homeAddress,
  additionalNotes
}) {
  return {
    version: 1,
    type: 'sos_emergency_data',
    createdAt: new Date().toISOString(),
    user: {
      id: userId,
      name: userName
    },
    emergencyContact: {
      name: emergencyContactName,
      phone: emergencyContactPhone,
      email: emergencyContactEmail
    },
    medical: {
      bloodGroup: bloodGroup || 'Unknown',
      allergies: allergies || [],
      info: medicalInfo || ''
    },
    homeAddress: homeAddress || '',
    notes: additionalNotes || ''
  };
}

/**
 * Create share distribution plan
 * @param {string[]} shares - Array of shares
 * @param {object} options - Distribution options
 * @returns {object[]} - Share distribution with holder info
 */
function createShareDistribution(shares, options = {}) {
  const {
    adminAddress = null,
    userAddress = null,
    trustedContacts = []
  } = options;

  const distribution = [];

  // Share 0: Platform Admin
  distribution.push({
    index: 0,
    share: shares[0],
    shareHash: hashShare(shares[0]),
    holderType: 'admin',
    holderAddress: adminAddress,
    holderName: 'Platform Admin',
    description: 'Held by D-CARPOOL platform administration'
  });

  // Share 1: User's own wallet
  distribution.push({
    index: 1,
    share: shares[1],
    shareHash: hashShare(shares[1]),
    holderType: 'user',
    holderAddress: userAddress,
    holderName: 'User Wallet',
    description: 'Encrypted and stored with user credentials'
  });

  // Shares 2-4: Trusted contacts
  for (let i = 2; i < shares.length && i - 2 < trustedContacts.length; i++) {
    const contact = trustedContacts[i - 2];
    distribution.push({
      index: i,
      share: shares[i],
      shareHash: hashShare(shares[i]),
      holderType: `trusted_contact_${i - 1}`,
      holderAddress: contact.walletAddress || null,
      holderName: contact.name || `Trusted Contact ${i - 1}`,
      holderEmail: contact.email,
      holderPhone: contact.phone,
      description: `Trusted contact: ${contact.name || 'Unknown'}`
    });
  }

  // Fill remaining shares with blockchain storage
  for (let i = distribution.length; i < shares.length; i++) {
    distribution.push({
      index: i,
      share: shares[i],
      shareHash: hashShare(shares[i]),
      holderType: 'blockchain_backup',
      holderAddress: null,
      holderName: 'Blockchain IPFS',
      description: 'Encrypted backup stored on IPFS'
    });
  }

  return distribution;
}

/**
 * Encrypt a share for storage
 * @param {string} share - The share to encrypt
 * @param {string} password - Encryption password
 * @returns {string} - Encrypted share (base64)
 */
function encryptShare(share, password) {
  const algorithm = 'aes-256-gcm';
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(share, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  // Combine: salt + iv + authTag + encrypted
  const combined = Buffer.concat([
    salt,
    iv,
    authTag,
    Buffer.from(encrypted, 'hex')
  ]);
  
  return combined.toString('base64');
}

/**
 * Decrypt an encrypted share
 * @param {string} encryptedShare - The encrypted share (base64)
 * @param {string} password - Decryption password
 * @returns {string} - Decrypted share
 */
function decryptShare(encryptedShare, password) {
  const algorithm = 'aes-256-gcm';
  const combined = Buffer.from(encryptedShare, 'base64');
  
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 32);
  const authTag = combined.slice(32, 48);
  const encrypted = combined.slice(48);
  
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, null, 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

module.exports = {
  // Core SSS functions
  splitSecret,
  combineShares,
  hashShare,
  verifyShareHash,
  
  // Helper functions
  createEmergencyData,
  createShareDistribution,
  encryptShare,
  decryptShare,
  
  // Constants
  DEFAULT_TOTAL_SHARES,
  DEFAULT_THRESHOLD
};
