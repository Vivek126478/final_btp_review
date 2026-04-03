const { User, Ride, RideParticipant, Complaint, SOSAlert, Rating } = require('../models');
const { Op } = require('sequelize');

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;

    const where = {};

    if (search) {
      where[Op.or] = [
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { walletAddress: { [Op.like]: `%${search}%` } }
      ];
    }

    if (status === 'banned') {
      where.isBanned = true;
    } else if (status === 'active') {
      where.isBanned = false;
      where.isActive = true;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['createdAt', 'updatedAt'] },
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    // Get additional stats for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const ridesAsDriver = await Ride.count({ where: { hostId: user.id } });
        const ridesAsRider = await RideParticipant.count({ where: { riderId: user.id } });
        const ratingsCount = await Rating.count({ where: { rateeId: user.id } });
        const complaintsCount = await Complaint.count({ where: { accusedId: user.id } });

        return {
          ...user.toJSON(),
          stats: {
            ridesAsDriver,
            ridesAsRider,
            ratingsCount,
            complaintsCount
          }
        };
      })
    );

    res.json({
      users: usersWithStats,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Get all rides
exports.getAllRides = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const where = {};
    if (status) {
      where.status = status;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: rides } = await Ride.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'host',
          attributes: ['id', 'username', 'email', 'walletAddress']
        },
        {
          model: RideParticipant,
          as: 'participants',
          include: [
            {
              model: User,
              as: 'rider',
              attributes: ['id', 'username']
            }
          ]
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      rides,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all rides error:', error);
    res.status(500).json({ error: 'Failed to fetch rides' });
  }
};

// Ban/Unban user
exports.toggleUserBan = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Cannot ban admin users' });
    }

    await user.update({
      isBanned: !user.isBanned
    });

    res.json({
      message: user.isBanned ? 'User banned successfully' : 'User unbanned successfully',
      user: {
        id: user.id,
        username: user.username,
        isBanned: user.isBanned
      }
    });
  } catch (error) {
    console.error('Toggle user ban error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
};

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { isActive: true, isBanned: false } });
    const bannedUsers = await User.count({ where: { isBanned: true } });

    const totalRides = await Ride.count();
    const activeRides = await Ride.count({ where: { status: 'active' } });
    const completedRides = await Ride.count({ where: { status: 'completed' } });
    const cancelledRides = await Ride.count({ where: { status: 'cancelled' } });

    const totalComplaints = await Complaint.count();
    const pendingComplaints = await Complaint.count({ where: { status: 'pending' } });
    const resolvedComplaints = await Complaint.count({ where: { status: 'resolved' } });

    const totalSOSAlerts = await SOSAlert.count();
    const activeSOSAlerts = await SOSAlert.count({ where: { status: 'active' } });

    const totalRatings = await Rating.count();

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        banned: bannedUsers
      },
      rides: {
        total: totalRides,
        active: activeRides,
        completed: completedRides,
        cancelled: cancelledRides
      },
      complaints: {
        total: totalComplaints,
        pending: pendingComplaints,
        resolved: resolvedComplaints
      },
      sos: {
        total: totalSOSAlerts,
        active: activeSOSAlerts
      },
      ratings: {
        total: totalRatings
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
};

// Merkle Audit Trail - Anchor completed rides to blockchain
exports.anchorMerkleRoot = async (req, res) => {
  try {
    const { buildMerkleTree, createRideHash } = require('../utils/merkleTree');
    const { getMerkleAuditTrailContract } = require('../utils/blockchain');
    
    // Get all completed rides that haven't been anchored yet
    const rides = await Ride.findAll({
      where: {
        status: 'completed',
        merkleAnchored: { [require('sequelize').Op.or]: [null, false] }
      },
      order: [['updatedAt', 'ASC']],
      limit: 100 // Batch size
    });
    
    if (rides.length === 0) {
      return res.json({ message: 'No rides to anchor', batchId: null });
    }
    
    // Create leaf hashes for each ride
    const rideHashes = rides.map(ride => createRideHash(ride));
    const rideIds = rides.map(ride => ride.id);
    
    // Build Merkle tree
    const tree = buildMerkleTree(rideHashes);
    
    // Anchor to blockchain
    const merkleContract = getMerkleAuditTrailContract();
    const tx = await merkleContract.anchorMerkleRoot(
      tree.root,
      rideIds,
      '', // No IPFS metadata for now
      { gasLimit: 500000 }
    );
    const receipt = await tx.wait();
    
    // Get batch ID from event
    let batchId = null;
    const event = receipt.logs.find(l => {
      try {
        return merkleContract.interface.parseLog(l)?.name === 'MerkleRootAnchored';
      } catch { return false; }
    });
    if (event) {
      const parsed = merkleContract.interface.parseLog(event);
      batchId = parsed.args.batchId.toString();
    }
    
    // Mark rides as anchored
    await Ride.update(
      { merkleAnchored: true, merkleBatchId: batchId },
      { where: { id: rideIds } }
    );
    
    res.json({
      message: 'Merkle root anchored successfully',
      batchId,
      merkleRoot: tree.root,
      rideCount: rides.length,
      txHash: tx.hash
    });
  } catch (error) {
    console.error('Anchor Merkle root error:', error);
    res.status(500).json({ error: 'Failed to anchor Merkle root: ' + error.message });
  }
};

// Get Merkle proof for a specific ride
exports.getMerkleProof = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { buildMerkleTree, createRideHash, generateProof } = require('../utils/merkleTree');
    
    const ride = await Ride.findByPk(rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }
    
    if (!ride.merkleAnchored || !ride.merkleBatchId) {
      return res.status(400).json({ error: 'Ride has not been anchored to blockchain yet' });
    }
    
    // Get all rides in the same batch
    const batchRides = await Ride.findAll({
      where: { merkleBatchId: ride.merkleBatchId },
      order: [['id', 'ASC']]
    });
    
    // Rebuild the tree
    const rideHashes = batchRides.map(r => createRideHash(r));
    const tree = buildMerkleTree(rideHashes);
    
    // Find index of this ride
    const leafIndex = batchRides.findIndex(r => r.id === parseInt(rideId));
    if (leafIndex === -1) {
      return res.status(500).json({ error: 'Ride not found in batch' });
    }
    
    // Generate proof
    const proof = generateProof(tree, leafIndex);
    const rideHash = createRideHash(ride);
    
    res.json({
      rideId: ride.id,
      rideHash,
      batchId: ride.merkleBatchId,
      merkleRoot: tree.root,
      proof,
      leafIndex
    });
  } catch (error) {
    console.error('Get Merkle proof error:', error);
    res.status(500).json({ error: 'Failed to generate Merkle proof' });
  }
};

// Verify Merkle proof on-chain
exports.verifyMerkleProof = async (req, res) => {
  try {
    const { rideId, rideHash, proof, batchId } = req.body;
    const { getMerkleAuditTrailContract } = require('../utils/blockchain');
    
    const merkleContract = getMerkleAuditTrailContract();
    
    // Convert proof to bytes32 array
    const proofBytes = proof.map(p => p.startsWith('0x') ? p : '0x' + p);
    
    const isValid = await merkleContract.verifyProofView(
      rideHash,
      proofBytes,
      batchId
    );
    
    res.json({
      rideId,
      batchId,
      isValid,
      message: isValid ? 'Proof verified! Ride exists in the anchored batch.' : 'Proof verification failed.'
    });
  } catch (error) {
    console.error('Verify Merkle proof error:', error);
    res.status(500).json({ error: 'Failed to verify Merkle proof: ' + error.message });
  }
};

// ===== CP-ABE Demo Functions =====
const { cpabeEncrypt, cpabeDecrypt, cpabeKeygen } = require('../utils/cpabeClient');

// Encrypt data with CP-ABE policy
exports.cpabeEncrypt = async (req, res) => {
  try {
    const { plaintext, policy } = req.body;
    
    if (!plaintext || !policy) {
      return res.status(400).json({ error: 'plaintext and policy are required' });
    }
    
    const plaintextB64 = Buffer.from(plaintext).toString('base64');
    const ciphertextB64 = await cpabeEncrypt({ policy, plaintextB64 });
    
    // Decode to show the encrypted structure
    let encryptedStructure = null;
    try {
      const decoded = Buffer.from(ciphertextB64, 'base64').toString('utf8');
      encryptedStructure = JSON.parse(decoded);
    } catch (e) {
      // Couldn't parse structure
    }
    
    res.json({
      success: true,
      policy,
      ciphertextB64,
      ciphertextLength: ciphertextB64.length,
      encryptedStructure,
      explanation: `Data encrypted with policy: "${policy}". Only users with attributes satisfying this policy can decrypt.`
    });
  } catch (error) {
    console.error('CP-ABE encrypt error:', error);
    res.status(500).json({ error: 'Encryption failed: ' + error.message });
  }
};

// Decrypt data with CP-ABE secret key
exports.cpabeDecrypt = async (req, res) => {
  try {
    const { ciphertextB64, secretKeyB64 } = req.body;
    
    if (!ciphertextB64 || !secretKeyB64) {
      return res.status(400).json({ error: 'ciphertextB64 and secretKeyB64 are required' });
    }
    
    // Decode key to show attributes
    let keyAttributes = [];
    try {
      const keyData = JSON.parse(Buffer.from(secretKeyB64, 'base64').toString('utf8'));
      keyAttributes = keyData.attributes || [];
    } catch (e) {}
    
    // Decode ciphertext to show policy
    let policy = '';
    try {
      const ctData = JSON.parse(Buffer.from(ciphertextB64, 'base64').toString('utf8'));
      policy = ctData.p || '';
    } catch (e) {}
    
    const plaintextB64 = await cpabeDecrypt({ secretKeyB64, ciphertextB64 });
    const plaintext = Buffer.from(plaintextB64, 'base64').toString('utf8');
    
    res.json({
      success: true,
      plaintext,
      keyAttributes,
      policy,
      explanation: `Decryption successful! Your attributes [${keyAttributes.join(', ')}] satisfy the policy "${policy}".`
    });
  } catch (error) {
    console.error('CP-ABE decrypt error:', error);
    res.status(400).json({ 
      success: false,
      error: 'Decryption failed: ' + error.message,
      explanation: 'Your attributes do not satisfy the encryption policy.'
    });
  }
};

// Generate secret key with attributes
exports.cpabeKeygen = async (req, res) => {
  try {
    const { attributes } = req.body;
    
    if (!attributes || !Array.isArray(attributes) || attributes.length === 0) {
      return res.status(400).json({ error: 'attributes array is required' });
    }
    
    const secretKeyB64 = await cpabeKeygen(attributes);
    
    // Decode to show structure
    let keyStructure = null;
    try {
      keyStructure = JSON.parse(Buffer.from(secretKeyB64, 'base64').toString('utf8'));
    } catch (e) {}
    
    res.json({
      success: true,
      attributes,
      secretKeyB64,
      keyStructure,
      explanation: `Secret key generated with attributes: [${attributes.join(', ')}]. This key can decrypt any ciphertext whose policy is satisfied by these attributes.`
    });
  } catch (error) {
    console.error('CP-ABE keygen error:', error);
    res.status(500).json({ error: 'Key generation failed: ' + error.message });
  }
};

// Get rides with encrypted fields for demo
exports.getRidesWithEncryption = async (req, res) => {
  try {
    const rides = await Ride.findAll({
      where: {
        [Op.or]: [
          { vehicleInfo: { [Op.like]: 'CPABE:%' } },
          { notes: { [Op.like]: 'CPABE:%' } }
        ]
      },
      include: [{
        model: User,
        as: 'host',
        attributes: ['id', 'username']
      }],
      limit: 10,
      order: [['createdAt', 'DESC']]
    });
    
    const ridesData = rides.map(ride => ({
      id: ride.id,
      host: ride.host?.username || 'Unknown',
      source: ride.source,
      destination: ride.destination,
      vehicleInfoEncrypted: ride.vehicleInfo?.startsWith('CPABE:'),
      vehicleInfoRaw: ride.vehicleInfo?.substring(0, 100) + (ride.vehicleInfo?.length > 100 ? '...' : ''),
      notesEncrypted: ride.notes?.startsWith('CPABE:'),
      notesRaw: ride.notes?.substring(0, 100) + (ride.notes?.length > 100 ? '...' : ''),
      status: ride.status,
      createdAt: ride.createdAt
    }));
    
    res.json({
      rides: ridesData,
      totalEncrypted: rides.length,
      explanation: 'These rides have CP-ABE encrypted fields. Only the host and accepted passengers can decrypt them.'
    });
  } catch (error) {
    console.error('Get encrypted rides error:', error);
    res.status(500).json({ error: 'Failed to fetch rides: ' + error.message });
  }
};
