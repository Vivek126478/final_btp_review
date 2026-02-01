const { Complaint, User, Ride } = require('../models');
const { getEthers, getDisputeResolutionContract } = require('../utils/blockchain');

// File a complaint
exports.fileComplaint = async (req, res) => {
  try {
    const { accusedId, rideId, category, description } = req.body;

    if (!accusedId || !category || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (accusedId === req.user.id) {
      return res.status(400).json({ error: 'Cannot file complaint against yourself' });
    }

    const validCategories = ['harassment', 'safety', 'fraud', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid complaint category' });
    }

    const complaint = await Complaint.create({
      complainantId: req.user.id,
      accusedId,
      rideId,
      category,
      description,
      status: 'pending'
    });

    // Best-effort on-chain anchoring (local hardhat): open a dispute with evidence hash.
    // We use ride.blockchainRideId (not DB id) so it matches the on-chain ride index.
    try {
      if (rideId) {
        const ride = await Ride.findByPk(rideId);
        if (ride && ride.blockchainRideId !== null && ride.blockchainRideId !== undefined) {
          const { keccak256, toUtf8Bytes } = getEthers();

          const payload = {
            complaintId: complaint.id,
            rideId: Number(ride.blockchainRideId),
            complainantId: req.user.id,
            accusedId,
            category,
            description
          };

          const evidenceHash = keccak256(toUtf8Bytes(JSON.stringify(payload)));

          const dispute = getDisputeResolutionContract();

          const tx = await dispute.openDispute(Number(ride.blockchainRideId), evidenceHash);
          const receipt = await tx.wait();

          let disputeId = null;
          try {
            const ev = receipt?.logs
              ? receipt.logs
                  .map((l) => {
                    try {
                      return dispute.interface.parseLog(l);
                    } catch {
                      return null;
                    }
                  })
                  .find((x) => x && x.name === 'DisputeOpened')
              : null;
            disputeId = ev?.args?.disputeId !== undefined ? Number(ev.args.disputeId) : null;
          } catch {
            disputeId = null;
          }

          await complaint.update({
            blockchainTxHash: receipt?.hash || tx?.hash || null,
            blockchainDisputeId: disputeId
          });
        }
      }
    } catch (chainError) {
      console.error('On-chain dispute anchoring failed (best effort):', chainError);
    }

    res.status(201).json({
      message: 'Complaint filed successfully',
      complaint
    });
  } catch (error) {
    console.error('File complaint error:', error);
    res.status(500).json({ error: 'Failed to file complaint' });
  }
};

// Get all complaints (admin only)
exports.getAllComplaints = async (req, res) => {
  try {
    const { status } = req.query;

    const where = {};
    if (status) {
      where.status = status;
    }

    const complaints = await Complaint.findAll({
      where,
      include: [
        {
          model: User,
          as: 'complainant',
          attributes: ['id', 'username', 'email', 'walletAddress']
        },
        {
          model: User,
          as: 'accused',
          attributes: ['id', 'username', 'email', 'walletAddress']
        },
        {
          model: Ride,
          as: 'ride',
          attributes: ['id', 'startLocation', 'endLocation', 'rideDateTime']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ complaints });
  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
};

// Get user's complaints
exports.getUserComplaints = async (req, res) => {
  try {
    const complaintsFiled = await Complaint.findAll({
      where: { complainantId: req.user.id },
      include: [
        {
          model: User,
          as: 'accused',
          attributes: ['id', 'username']
        },
        {
          model: Ride,
          as: 'ride',
          attributes: ['id', 'startLocation', 'endLocation']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const complaintsReceived = await Complaint.findAll({
      where: { accusedId: req.user.id },
      include: [
        {
          model: User,
          as: 'complainant',
          attributes: ['id', 'username']
        },
        {
          model: Ride,
          as: 'ride',
          attributes: ['id', 'startLocation', 'endLocation']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      complaintsFiled,
      complaintsReceived
    });
  } catch (error) {
    console.error('Get user complaints error:', error);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
};

// Update complaint status (admin only)
exports.updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const validStatuses = ['pending', 'investigating', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const complaint = await Complaint.findByPk(id);

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    await complaint.update({
      status,
      adminNotes: adminNotes || complaint.adminNotes,
      resolvedAt: ['resolved', 'dismissed'].includes(status) ? new Date() : null
    });

    res.json({
      message: 'Complaint updated successfully',
      complaint
    });
  } catch (error) {
    console.error('Update complaint error:', error);
    res.status(500).json({ error: 'Failed to update complaint' });
  }
};
