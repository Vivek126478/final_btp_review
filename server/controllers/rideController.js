const { Ride, RideParticipant, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const {
  sendRideJoinRequestEmail,
  sendRideJoinAcceptedEmailToParticipant,
  sendRideJoinAcceptedEmailToHost,
  sendRideUpdatedEmail,
  sendRideInviteEmail,
  sendSearchAlertMatchEmail,
  sendRideBoardingOTPEmail
} = require('../utils/emailService');
const { writeAuditLog } = require('../utils/auditLog');
const { createSearchAlert, checkAndNotifyForRide } = require('../utils/searchAlerts');
const {
  ensureRideKey,
  encryptRidePrivateField,
  decryptRidePrivateFieldForViewer
} = require('../utils/cpabeHelpers');

const {
  startBoardingSession,
  getBoardingStatus,
  verifyPassengerOtp
} = require('../utils/boardingOtpStore');

const {
  hideRideForUser,
  unhideRideForUser,
  getHiddenRideIdsForUser,
  blockRiderForHost,
  unblockRiderForHost,
  isRiderBlockedByHost,
  recordRapidLeave,
  isUserFlagged
} = require('../utils/moderationStore');

// Create a new ride
exports.createRide = async (req, res) => {
  try {
    const {
      blockchainRideId,
      startLocation,
      endLocation,
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
      rideDateTime,
      totalSeats,
      pricePerSeat,
      tags,
      vehicleInfo,
      notes,
      status
    } = req.body;

    const requestedStatus = status || 'active';
    if (!['draft', 'active'].includes(requestedStatus)) {
      return res.status(400).json({ error: 'Invalid status. Allowed values: draft, active' });
    }

    if (requestedStatus === 'active') {
      const existingActiveRide = await Ride.findOne({
        where: {
          driverId: req.user.id,
          status: 'active'
        }
      });

      if (existingActiveRide) {
        return res.status(400).json({
          error: 'You already have an active ride. Cancel or complete it before posting another active ride. You can save new rides as drafts.',
          activeRideId: existingActiveRide.id
        });
      }
    }

    const ride = await Ride.create({
      blockchainRideId,
      driverId: req.user.id,
      startLocation,
      endLocation,
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
      rideDateTime,
      availableSeats: totalSeats,
      totalSeats,
      pricePerSeat: pricePerSeat || 0,
      tags: tags || [],
      vehicleInfo: null,
      notes: null,
      status: requestedStatus
    });

    // CP-ABE: create host key + encrypt sensitive ride fields (best effort)
    try {
      await ensureRideKey({ userId: req.user.id, rideId: ride.id, kind: 'host' });

      const encNotes = await encryptRidePrivateField({
        rideId: ride.id,
        plaintext: notes || null
      });

      const encVehicle = await encryptRidePrivateField({
        rideId: ride.id,
        plaintext: vehicleInfo || null
      });

      await ride.update({
        notes: encNotes,
        vehicleInfo: encVehicle
      });
    } catch (cpabeError) {
      console.error('CP-ABE failed (ride.create):', cpabeError);
      // fallback to plaintext so ride creation doesn't break
      await ride.update({
        notes: notes || null,
        vehicleInfo: vehicleInfo || null
      });
    }

    try {
      await writeAuditLog({
        action: 'ride.create',
        actor: { id: req.user.id, username: req.user.username, role: req.user.role },
        rideId: ride.id,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        after: ride.toJSON()
      });
    } catch (auditError) {
      console.error('Audit log failed (ride.create):', auditError);
    }

    try {
      await checkAndNotifyForRide({
        ride,
        notify: async ({ alert, ride: matchedRide }) => {
          const baseUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || '';
          const rideLink = baseUrl ? `${baseUrl.replace(/\/$/, '')}/ride/${matchedRide.id}` : '';

          await sendSearchAlertMatchEmail({
            toEmail: alert.email,
            username: null,
            filters: alert.filters,
            ride: matchedRide,
            rideLink
          });
        }
      });
    } catch (alertError) {
      console.error('Search alert notify failed (ride.create):', alertError);
    }

    res.status(201).json({
      message: 'Ride created successfully',
      ride
    });
  } catch (error) {
    console.error('Create ride error:', error);
    res.status(500).json({ error: 'Failed to create ride' });
  }
};

exports.hideRide = async (req, res) => {
  try {
    const { id } = req.params;
    const ride = await Ride.findByPk(id);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }
    hideRideForUser({ userId: req.user.id, rideId: id });
    return res.json({ message: 'Ride hidden' });
  } catch (error) {
    console.error('Hide ride error:', error);
    return res.status(500).json({ error: 'Failed to hide ride' });
  }
};

exports.unhideRide = async (req, res) => {
  try {
    const { id } = req.params;
    unhideRideForUser({ userId: req.user.id, rideId: id });
    return res.json({ message: 'Ride unhidden' });
  } catch (error) {
    console.error('Unhide ride error:', error);
    return res.status(500).json({ error: 'Failed to unhide ride' });
  }
};

exports.blockRider = async (req, res) => {
  try {
    const { id, riderId } = req.params;
    const ride = await Ride.findByPk(id);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.driverId !== req.user.id) {
      return res.status(403).json({ error: 'Only the host can block riders' });
    }

    blockRiderForHost({ hostId: req.user.id, riderId });

    try {
      await RideParticipant.update(
        { status: 'expired' },
        {
          where: {
            rideId: ride.id,
            riderId: riderId,
            status: 'pending'
          }
        }
      );
    } catch (e) {
      console.error('Failed to expire pending application while blocking:', e);
    }

    return res.json({ message: 'Rider blocked' });
  } catch (error) {
    console.error('Block rider error:', error);
    return res.status(500).json({ error: 'Failed to block rider' });
  }
};

exports.unblockRider = async (req, res) => {
  try {
    const { id, riderId } = req.params;
    const ride = await Ride.findByPk(id);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.driverId !== req.user.id) {
      return res.status(403).json({ error: 'Only the host can unblock riders' });
    }

    unblockRiderForHost({ hostId: req.user.id, riderId });
    return res.json({ message: 'Rider unblocked' });
  } catch (error) {
    console.error('Unblock rider error:', error);
    return res.status(500).json({ error: 'Failed to unblock rider' });
  }
};

exports.startRideBoardingOTP = async (req, res) => {
  try {
    const { id } = req.params;
    const ride = await Ride.findByPk(id);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    if (ride.driverId !== req.user.id) {
      return res.status(403).json({ error: 'Only the host can start boarding verification' });
    }

    if (ride.status !== 'active') {
      return res.status(400).json({ error: 'Ride is not active' });
    }

    const participants = await RideParticipant.findAll({
      where: {
        rideId: ride.id,
        status: { [Op.in]: ['accepted', 'joined'] }
      },
      include: [{ model: User, as: 'rider' }]
    });

    if (!participants.length) {
      return res.status(400).json({ error: 'No accepted participants to verify' });
    }

    const toVerify = participants
      .filter(p => p.rider && p.rider.email)
      .map(p => ({
        participantId: p.id,
        riderId: p.riderId,
        email: p.rider.email,
        username: p.rider.username
      }));

    if (!toVerify.length) {
      return res.status(400).json({ error: 'No accepted participants have an email address to send OTP to' });
    }

    const { otpsToSend } = startBoardingSession({
      rideId: ride.id,
      participants: toVerify.map(p => ({ participantId: p.participantId, riderId: p.riderId, email: p.email }))
    });

    for (const item of otpsToSend) {
      const u = toVerify.find(x => x.participantId === item.participantId);
      try {
        await sendRideBoardingOTPEmail({
          participantEmail: item.email,
          participantUsername: u?.username,
          ride,
          otp: item.otp
        });
      } catch (emailError) {
        console.error('Boarding OTP email failed:', emailError);
      }
    }

    const status = getBoardingStatus({ rideId: ride.id });
    return res.json({ message: 'Boarding OTPs sent', status });
  } catch (error) {
    console.error('Start boarding OTP error:', error);
    return res.status(500).json({
      error: 'Failed to start boarding verification',
      details: error?.message || String(error)
    });
  }
};

exports.getRideBoardingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const ride = await Ride.findByPk(id);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    if (ride.driverId !== req.user.id) {
      return res.status(403).json({ error: 'Only the host can view boarding status' });
    }

    const status = getBoardingStatus({ rideId: ride.id });
    if (!status) {
      return res.json({ status: null });
    }

    return res.json({ status });
  } catch (error) {
    console.error('Get boarding status error:', error);
    return res.status(500).json({ error: 'Failed to fetch boarding status' });
  }
};

exports.verifyRidePassengerOTP = async (req, res) => {
  try {
    const { id } = req.params;
    const { participantId, otp } = req.body || {};

    if (!participantId || !otp) {
      return res.status(400).json({ error: 'participantId and otp are required' });
    }

    const ride = await Ride.findByPk(id);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    if (ride.driverId !== req.user.id) {
      return res.status(403).json({ error: 'Only the host can verify passenger OTPs' });
    }

    const participant = await RideParticipant.findOne({ where: { id: participantId, rideId: ride.id } });
    if (!participant || !['accepted', 'joined'].includes(participant.status)) {
      return res.status(400).json({ error: 'Invalid participant for verification' });
    }

    const result = verifyPassengerOtp({
      rideId: ride.id,
      participantId,
      otp: String(otp)
    });

    if (!result.ok) {
      return res.status(400).json({ error: result.error || 'Verification failed' });
    }

    const status = getBoardingStatus({ rideId: ride.id });
    return res.json({ message: 'OTP verified', status });
  } catch (error) {
    console.error('Verify passenger OTP error:', error);
    return res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

exports.createRideSearchAlert = async (req, res) => {
  try {
    const filters = req.body?.filters || {};

    if (!req.user?.email) {
      return res.status(400).json({ error: 'User email is required to create alerts' });
    }

    const alert = await createSearchAlert({
      userId: req.user.id,
      email: req.user.email,
      filters
    });

    res.status(201).json({ message: 'Alert created', alert });
  } catch (error) {
    console.error('Create search alert error:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
};

exports.inviteToRide = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, phone } = req.body || {};

    if (!email && !phone) {
      return res.status(400).json({ error: 'Provide email or phone' });
    }

    const ride = await Ride.findByPk(id);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    const isHost = ride.driverId === req.user.id;

    let isAcceptedRider = false;
    if (!isHost) {
      const participation = await RideParticipant.findOne({
        where: {
          rideId: ride.id,
          riderId: req.user.id,
          status: { [Op.in]: ['accepted', 'joined'] }
        }
      });
      isAcceptedRider = !!participation;
    }

    if (!isHost && !isAcceptedRider) {
      return res.status(403).json({ error: 'Not allowed to invite for this ride' });
    }

    const baseUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || '';
    const inviteLink = baseUrl ? `${baseUrl.replace(/\/$/, '')}/ride/${ride.id}` : `Ride ID: ${ride.id}`;
    const shareText = `Campus Wheels ride invite from ${req.user.username}: ${ride.startLocation} → ${ride.endLocation} at ${new Date(ride.rideDateTime).toLocaleString()}. Open: ${inviteLink}`;

    if (email) {
      await sendRideInviteEmail({
        toEmail: email,
        inviterUsername: req.user.username,
        ride,
        inviteLink: baseUrl ? inviteLink : ''
      });
    }

    res.json({
      message: 'Invite prepared',
      inviteLink: baseUrl ? inviteLink : null,
      shareText
    });
  } catch (error) {
    console.error('Invite to ride error:', error);
    res.status(500).json({ error: 'Failed to invite' });
  }
};

// Update a ride (driver only)
exports.updateRide = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      startLocation,
      endLocation,
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
      rideDateTime,
      totalSeats,
      pricePerSeat,
      tags,
      vehicleInfo,
      notes,
      status
    } = req.body;

    const beforeSnapshot = {};

    const ride = await Ride.findByPk(id, {
      include: [
        {
          model: RideParticipant,
          as: 'participants',
          where: { status: { [Op.in]: ['accepted', 'joined'] } },
          required: false
        }
      ]
    });

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.driverId !== req.user.id) {
      return res.status(403).json({ error: 'Only the driver can update this ride' });
    }

    if (!['draft', 'active'].includes(ride.status)) {
      return res.status(400).json({ error: 'Only draft or active rides can be edited' });
    }

    beforeSnapshot.startLocation = ride.startLocation;
    beforeSnapshot.endLocation = ride.endLocation;
    beforeSnapshot.rideDateTime = ride.rideDateTime;
    beforeSnapshot.totalSeats = ride.totalSeats;
    beforeSnapshot.availableSeats = ride.availableSeats;
    beforeSnapshot.pricePerSeat = ride.pricePerSeat;
    beforeSnapshot.notes = ride.notes;
    beforeSnapshot.vehicleInfo = ride.vehicleInfo;

    // If status update is requested, validate it (optional)
    let requestedStatus = ride.status;
    if (status !== undefined) {
      if (!['draft', 'active'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Allowed values: draft, active' });
      }
      requestedStatus = status;
    }

    if (requestedStatus === 'active' && ride.status !== 'active') {
      const existingActiveRide = await Ride.findOne({
        where: {
          driverId: req.user.id,
          status: 'active',
          id: { [Op.ne]: ride.id }
        }
      });

      if (existingActiveRide) {
        return res.status(400).json({
          error: 'You already have an active ride. Cancel or complete it before activating another ride.',
          activeRideId: existingActiveRide.id
        });
      }
    }

    // Seat update rules: cannot reduce below current accepted seats booked
    const acceptedSeatsBooked = Array.isArray(ride.participants)
      ? ride.participants.reduce((sum, p) => sum + (parseInt(p.seatsBooked || 1) || 0), 0)
      : 0;
    if (totalSeats !== undefined && totalSeats !== null) {
      const newTotalSeats = parseInt(totalSeats);
      if (Number.isNaN(newTotalSeats) || newTotalSeats < 1 || newTotalSeats > 10) {
        return res.status(400).json({ error: 'Invalid totalSeats' });
      }

      if (newTotalSeats < acceptedSeatsBooked) {
        return res.status(400).json({
          error: 'Cannot reduce total seats below the number of accepted seats booked',
          acceptedSeatsBooked
        });
      }

      const newAvailableSeats = newTotalSeats - acceptedSeatsBooked;
      await ride.update({
        startLocation: startLocation !== undefined ? startLocation : ride.startLocation,
        endLocation: endLocation !== undefined ? endLocation : ride.endLocation,
        startLatitude: startLatitude !== undefined ? startLatitude : ride.startLatitude,
        startLongitude: startLongitude !== undefined ? startLongitude : ride.startLongitude,
        endLatitude: endLatitude !== undefined ? endLatitude : ride.endLatitude,
        endLongitude: endLongitude !== undefined ? endLongitude : ride.endLongitude,
        rideDateTime: rideDateTime !== undefined ? rideDateTime : ride.rideDateTime,
        totalSeats: newTotalSeats,
        availableSeats: newAvailableSeats,
        pricePerSeat: pricePerSeat !== undefined ? pricePerSeat : ride.pricePerSeat,
        tags: tags !== undefined ? tags : ride.tags,
        vehicleInfo: ride.vehicleInfo,
        notes: ride.notes,
        status: requestedStatus
      });
    } else {
      await ride.update({
        startLocation: startLocation !== undefined ? startLocation : ride.startLocation,
        endLocation: endLocation !== undefined ? endLocation : ride.endLocation,
        startLatitude: startLatitude !== undefined ? startLatitude : ride.startLatitude,
        startLongitude: startLongitude !== undefined ? startLongitude : ride.startLongitude,
        endLatitude: endLatitude !== undefined ? endLatitude : ride.endLatitude,
        endLongitude: endLongitude !== undefined ? endLongitude : ride.endLongitude,
        rideDateTime: rideDateTime !== undefined ? rideDateTime : ride.rideDateTime,
        pricePerSeat: pricePerSeat !== undefined ? pricePerSeat : ride.pricePerSeat,
        tags: tags !== undefined ? tags : ride.tags,
        vehicleInfo: ride.vehicleInfo,
        notes: ride.notes,
        status: requestedStatus
      });
    }

    // CP-ABE: encrypt sensitive ride fields if provided (best effort)
    try {
      const updates = {};
      if (notes !== undefined) {
        updates.notes = await encryptRidePrivateField({ rideId: ride.id, plaintext: notes });
      }
      if (vehicleInfo !== undefined) {
        updates.vehicleInfo = await encryptRidePrivateField({ rideId: ride.id, plaintext: vehicleInfo });
      }
      if (Object.keys(updates).length > 0) {
        await ride.update(updates);
      }
    } catch (cpabeError) {
      console.error('CP-ABE failed (ride.update):', cpabeError);
      // fallback to plaintext if encryption fails
      const updates = {};
      if (notes !== undefined) updates.notes = notes;
      if (vehicleInfo !== undefined) updates.vehicleInfo = vehicleInfo;
      if (Object.keys(updates).length > 0) {
        await ride.update(updates);
      }
    }

    try {
      await writeAuditLog({
        action: 'ride.update',
        actor: { id: req.user.id, username: req.user.username, role: req.user.role },
        rideId: ride.id,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        before: beforeSnapshot,
        after: ride.toJSON()
      });
    } catch (auditError) {
      console.error('Audit log failed (ride.update):', auditError);
    }

    try {
      await checkAndNotifyForRide({
        ride,
        notify: async ({ alert, ride: matchedRide }) => {
          const baseUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || '';
          const rideLink = baseUrl ? `${baseUrl.replace(/\/$/, '')}/ride/${matchedRide.id}` : '';

          await sendSearchAlertMatchEmail({
            toEmail: alert.email,
            username: null,
            filters: alert.filters,
            ride: matchedRide,
            rideLink
          });
        }
      });
    } catch (alertError) {
      console.error('Search alert notify failed (ride.update):', alertError);
    }

    // Notify accepted participants about updates (best effort)
    try {
      const includeRider = {
        model: User,
        as: 'rider',
        attributes: ['id', 'username', 'email']
      };

      const participants = await RideParticipant.findAll({
        where: {
          rideId: ride.id,
          status: { [Op.in]: ['accepted', 'joined'] }
        },
        include: [includeRider]
      });

      const changes = [];
      if (beforeSnapshot.startLocation !== ride.startLocation) {
        changes.push({ field: 'From', from: beforeSnapshot.startLocation, to: ride.startLocation });
      }
      if (beforeSnapshot.endLocation !== ride.endLocation) {
        changes.push({ field: 'To', from: beforeSnapshot.endLocation, to: ride.endLocation });
      }
      if (String(beforeSnapshot.rideDateTime) !== String(ride.rideDateTime)) {
        changes.push({
          field: 'Date & Time',
          from: new Date(beforeSnapshot.rideDateTime).toLocaleString(),
          to: new Date(ride.rideDateTime).toLocaleString()
        });
      }
      if (String(beforeSnapshot.pricePerSeat) !== String(ride.pricePerSeat)) {
        changes.push({ field: 'Price per seat', from: `₹${beforeSnapshot.pricePerSeat || 0}`, to: `₹${ride.pricePerSeat || 0}` });
      }
      if (String(beforeSnapshot.totalSeats) !== String(ride.totalSeats)) {
        changes.push({ field: 'Total seats', from: beforeSnapshot.totalSeats, to: ride.totalSeats });
      }
      if (String(beforeSnapshot.availableSeats) !== String(ride.availableSeats)) {
        changes.push({ field: 'Available seats', from: beforeSnapshot.availableSeats, to: ride.availableSeats });
      }
      if (String(beforeSnapshot.notes || '') !== String(ride.notes || '')) {
        changes.push({ field: 'Notes', from: beforeSnapshot.notes || '(empty)', to: ride.notes || '(empty)' });
      }
      if (JSON.stringify(beforeSnapshot.vehicleInfo || null) !== JSON.stringify(ride.vehicleInfo || null)) {
        changes.push({ field: 'Vehicle info', from: 'Updated', to: 'Updated' });
      }

      const hostUsername = req.user?.username || 'Host';

      await Promise.all(
        participants
          .filter(p => p?.rider?.email)
          .map(p =>
            sendRideUpdatedEmail({
              participantEmail: p.rider.email,
              participantUsername: p.rider.username,
              hostUsername,
              rideId: ride.id,
              changes,
              updatedRide: ride
            })
          )
      );
    } catch (notifyError) {
      console.error('Failed to send ride update notifications:', notifyError);
    }

    res.json({
      message: 'Ride updated successfully',
      ride
    });
  } catch (error) {
    console.error('Update ride error:', error);
    res.status(500).json({ error: 'Failed to update ride' });
  }
};

// Publish a draft ride (driver only)
exports.publishDraftRide = async (req, res) => {
  try {
    const { id } = req.params;

    const ride = await Ride.findByPk(id);

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.driverId !== req.user.id) {
      return res.status(403).json({ error: 'Only the driver can publish this ride' });
    }

    if (ride.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft rides can be published' });
    }

    const existingActiveRide = await Ride.findOne({
      where: {
        driverId: req.user.id,
        status: 'active'
      }
    });

    if (existingActiveRide) {
      return res.status(400).json({
        error: 'You already have an active ride. Cancel or complete it before publishing a draft.',
        activeRideId: existingActiveRide.id
      });
    }

    await ride.update({ status: 'active' });

    try {
      await checkAndNotifyForRide({
        ride,
        notify: async ({ alert, ride: matchedRide }) => {
          const baseUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || '';
          const rideLink = baseUrl ? `${baseUrl.replace(/\/$/, '')}/ride/${matchedRide.id}` : '';

          await sendSearchAlertMatchEmail({
            toEmail: alert.email,
            username: null,
            filters: alert.filters,
            ride: matchedRide,
            rideLink
          });
        }
      });
    } catch (alertError) {
      console.error('Search alert notify failed (ride.publish):', alertError);
    }

    res.json({
      message: 'Ride published successfully',
      ride
    });
  } catch (error) {
    console.error('Publish draft ride error:', error);
    res.status(500).json({ error: 'Failed to publish draft ride' });
  }
};

// Get all active rides with filters
exports.searchRides = async (req, res) => {
  try {
    const {
      startLocation,
      endLocation,
      date,
      minSeats,
      tags,
      maxPrice,
      page = 1,
      limit = 20
    } = req.query;

    const where = { status: 'active' };

    if (startLocation) {
      where.startLocation = { [Op.like]: `%${startLocation}%` };
    }

    if (endLocation) {
      where.endLocation = { [Op.like]: `%${endLocation}%` };
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      where.rideDateTime = {
        [Op.between]: [startOfDay, endOfDay]
      };
    }

    if (minSeats) {
      where.availableSeats = { [Op.gte]: parseInt(minSeats) };
    }

    if (maxPrice) {
      where.pricePerSeat = { [Op.lte]: parseFloat(maxPrice) };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: rides } = await Ride.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'driver',
          attributes: ['id', 'username', 'profilePicture', 'walletAddress']
        },
        {
          model: RideParticipant,
          as: 'participants',
          where: { status: { [Op.in]: ['accepted', 'joined'] } },
          required: false,
          include: [
            {
              model: User,
              as: 'rider',
              attributes: ['id', 'username', 'profilePicture']
            }
          ]
        }
      ],
      order: [['rideDateTime', 'ASC']],
      limit: parseInt(limit),
      offset
    });

    // Filter by tags if provided
    let filteredRides = rides;
    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim().toLowerCase());
      filteredRides = rides.filter(ride => {
        if (!ride.tags || ride.tags.length === 0) return false;
        return ride.tags.some(tag => tagArray.includes(tag.toLowerCase()));
      });
    }

    if (req.user?.id) {
      const hiddenIds = getHiddenRideIdsForUser({ userId: req.user.id });
      if (hiddenIds.length) {
        filteredRides = filteredRides.filter(r => !hiddenIds.includes(String(r.id)));
      }
    }

    res.json({
      rides: filteredRides,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Search rides error:', error);
    res.status(500).json({ error: 'Failed to search rides' });
  }
};

// Get ride by ID
exports.getRideById = async (req, res) => {
  try {
    const { id } = req.params;

    const ride = await Ride.findByPk(id, {
      include: [
        {
          model: User,
          as: 'driver',
          attributes: ['id', 'username', 'email', 'phoneNumber', 'profilePicture', 'walletAddress']
        },
        {
          model: RideParticipant,
          as: 'participants',
          include: [
            {
              model: User,
              as: 'rider',
              attributes: ['id', 'username', 'email', 'profilePicture', 'phoneNumber']
            }
          ]
        }
      ]
    });

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.status === 'draft') {
      if (!req.user || ride.driverId !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to access this ride' });
      }
    }

    // Privacy: hide contact details until the host accepts.
    const viewerUserId = req.user ? req.user.id : null;
    const isHost = viewerUserId && ride.driverId === viewerUserId;

    const acceptedForViewer = Array.isArray(ride.participants)
      ? ride.participants.some(p =>
          ['accepted', 'joined'].includes(p.status) && viewerUserId && p.riderId === viewerUserId
        )
      : false;

    // CP-ABE: decrypt ride notes + vehicleInfo for host/accepted viewer only
    try {
      if (isHost || acceptedForViewer) {
        const decryptedNotes = await decryptRidePrivateFieldForViewer({
          userId: viewerUserId,
          isHost,
          isAccepted: acceptedForViewer,
          rideId: ride.id,
          value: ride.notes
        });
        const decryptedVehicle = await decryptRidePrivateFieldForViewer({
          userId: viewerUserId,
          isHost,
          isAccepted: acceptedForViewer,
          rideId: ride.id,
          value: ride.vehicleInfo
        });

        ride.notes = decryptedNotes;
        ride.vehicleInfo = decryptedVehicle;
      } else {
        // for unauthorized viewers, don't leak encrypted blobs
        ride.notes = null;
        ride.vehicleInfo = null;
      }
    } catch (cpabeError) {
      console.error('CP-ABE decrypt failed (ride.getRideById):', cpabeError);
      // do not break response
    }

    if (!isHost && !acceptedForViewer) {
      if (ride.driver) {
        ride.driver.email = undefined;
        ride.driver.phoneNumber = undefined;
      }
    }

    if (Array.isArray(ride.participants)) {
      ride.participants.forEach(p => {
        // For host: hide pending/rejected rider phone/email
        if (isHost) {
          if (!['accepted', 'joined'].includes(p.status) && p.rider) {
            p.rider.email = undefined;
            p.rider.phoneNumber = undefined;
          }
          return;
        }

        // For riders/guests: hide other riders' contact info always
        if (p.rider) {
          p.rider.email = undefined;
          p.rider.phoneNumber = undefined;
        }
      });
    }

    res.json({ ride });
  } catch (error) {
    console.error('Get ride error:', error);
    res.status(500).json({ error: 'Failed to fetch ride' });
  }
};

// Join a ride
exports.joinRide = async (req, res) => {
  try {
    const { id } = req.params;
    const requestedSeatsRaw = req.body?.seatsBooked;
    const seatsBooked = requestedSeatsRaw === undefined ? 1 : parseInt(requestedSeatsRaw);

    if (Number.isNaN(seatsBooked) || seatsBooked < 1 || seatsBooked > 10) {
      return res.status(400).json({ error: 'Invalid seatsBooked' });
    }

    const ride = await Ride.findByPk(id);

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.status !== 'active') {
      return res.status(400).json({ error: 'Ride is not active' });
    }

    if (ride.driverId === req.user.id) {
      return res.status(400).json({ error: 'Cannot join your own ride' });
    }

    // Global anti-spam flag (repeated rapid leaves)
    if (isUserFlagged({ userId: req.user.id })) {
      return res.status(403).json({
        error: 'You are temporarily restricted from joining rides due to suspicious activity. Please contact support.'
      });
    }

    // Host-local blocklist
    if (isRiderBlockedByHost({ hostId: ride.driverId, riderId: req.user.id })) {
      return res.status(403).json({ error: 'You are blocked by this host' });
    }

    if (ride.availableSeats <= 0) {
      return res.status(400).json({ error: 'No seats available' });
    }

    if (seatsBooked > ride.availableSeats) {
      return res.status(400).json({
        error: 'Not enough seats available',
        availableSeats: ride.availableSeats
      });
    }

    // Check if already requested/accepted
    const existingParticipant = await RideParticipant.findOne({
      where: {
        rideId: id,
        riderId: req.user.id,
        status: { [Op.in]: ['pending', 'accepted', 'joined'] }
      }
    });

    if (existingParticipant) {
      return res.status(400).json({ error: 'You already have a pending/accepted request for this ride' });
    }

    // Enforce max 3 pending applications (across all rides)
    const pendingApplicationsCount = await RideParticipant.count({
      where: {
        riderId: req.user.id,
        status: 'pending'
      }
    });

    if (pendingApplicationsCount >= 3) {
      return res.status(400).json({
        error: 'You can apply to at most 3 rides at a time. Please wait for a decision or cancel/expire an application.'
      });
    }

    const slotMinutes = parseInt(process.env.TIME_SLOT_MINUTES || '60');
    const slotMs = (Number.isNaN(slotMinutes) ? 60 : slotMinutes) * 60 * 1000;
    const rideTime = new Date(ride.rideDateTime);
    const windowStart = new Date(rideTime.getTime() - slotMs);
    const windowEnd = new Date(rideTime.getTime() + slotMs);

    const conflictingParticipation = await RideParticipant.findOne({
      where: {
        riderId: req.user.id,
        status: { [Op.in]: ['pending', 'accepted', 'joined'] },
        rideId: { [Op.ne]: id }
      },
      include: [
        {
          model: Ride,
          as: 'ride',
          required: true,
          where: {
            status: 'active',
            rideDateTime: { [Op.between]: [windowStart, windowEnd] }
          }
        }
      ]
    });

    if (conflictingParticipation) {
      return res.status(400).json({
        error: 'You have already joined another ride in the same time slot',
        conflictRideId: conflictingParticipation.rideId,
        conflictRideDateTime: conflictingParticipation.ride?.rideDateTime
      });
    }

    // Create a pending join request (do not deduct seats until host accepts)
    const participant = await RideParticipant.create({
      rideId: id,
      riderId: req.user.id,
      seatsBooked,
      status: 'pending'
    });

    // Notify host via email (best effort)
    try {
      const host = await User.findByPk(ride.driverId);
      if (host) {
        await sendRideJoinRequestEmail({
          hostEmail: host.email,
          hostUsername: host.username,
          riderUsername: req.user.username,
          seatsBooked,
          rideDetails: ride
        });
      }
    } catch (emailError) {
      console.error('Failed to send join request email:', emailError);
    }

    res.json({
      message: 'Join request submitted. Awaiting host approval.',
      participant
    });
  } catch (error) {
    console.error('Join ride error:', error);
    res.status(500).json({ error: 'Failed to join ride' });
  }
};

// Accept a join request (driver only)
exports.acceptJoinRequest = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id, participantId } = req.params;

    const ride = await Ride.findByPk(id, { transaction: t });
    if (!ride) {
      await t.rollback();
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.driverId !== req.user.id) {
      await t.rollback();
      return res.status(403).json({ error: 'Only the driver can accept requests' });
    }

    if (ride.status !== 'active') {
      await t.rollback();
      return res.status(400).json({ error: 'Ride is not active' });
    }

    const participant = await RideParticipant.findOne({
      where: { id: participantId, rideId: id },
      include: [{ model: User, as: 'rider' }],
      transaction: t
    });

    if (!participant) {
      await t.rollback();
      return res.status(404).json({ error: 'Join request not found' });
    }

    if (participant.status !== 'pending') {
      await t.rollback();
      return res.status(400).json({ error: 'Only pending requests can be accepted' });
    }

    const seatsBooked = parseInt(participant.seatsBooked || 1) || 1;
    if (seatsBooked > ride.availableSeats) {
      await t.rollback();
      return res.status(400).json({
        error: 'Not enough seats available to accept this request',
        availableSeats: ride.availableSeats
      });
    }

    await participant.update({ status: 'accepted' }, { transaction: t });
    await ride.update({ availableSeats: ride.availableSeats - seatsBooked }, { transaction: t });

    // Expire other pending applications for this rider (best effort, same transaction)
    await RideParticipant.update(
      { status: 'expired' },
      {
        where: {
          riderId: participant.riderId,
          status: 'pending',
          rideId: { [Op.ne]: id }
        },
        transaction: t
      }
    );

    await t.commit();

    // CP-ABE: generate accepted rider key (best effort)
    try {
      await ensureRideKey({ userId: participant.riderId, rideId: ride.id, kind: 'accepted' });
    } catch (cpabeError) {
      console.error('CP-ABE failed (acceptJoinRequest keygen):', cpabeError);
    }

    // Email both parties (best effort)
    try {
      const host = await User.findByPk(ride.driverId);
      const rider = participant.rider;
      const totalCost = Number(ride.pricePerSeat || 0) * seatsBooked;

      if (host && rider) {
        await sendRideJoinAcceptedEmailToParticipant({
          participantEmail: rider.email,
          participantUsername: rider.username,
          seatsBooked,
          totalCost,
          rideDetails: ride,
          hostDetails: {
            username: host.username,
            email: host.email,
            phoneNumber: host.phoneNumber
          }
        });

        await sendRideJoinAcceptedEmailToHost({
          hostEmail: host.email,
          hostUsername: host.username,
          seatsBooked,
          totalCost,
          rideDetails: ride,
          participantDetails: {
            username: rider.username,
            email: rider.email,
            phoneNumber: rider.phoneNumber
          }
        });
      }
    } catch (emailError) {
      console.error('Failed to send acceptance emails:', emailError);
    }

    return res.json({ message: 'Request accepted', ride, participantId: participant.id });
  } catch (error) {
    await t.rollback();
    console.error('Accept join request error:', error);
    return res.status(500).json({ error: 'Failed to accept join request' });
  }
};

// Reject a join request (driver only)
exports.rejectJoinRequest = async (req, res) => {
  try {
    const { id, participantId } = req.params;

    const ride = await Ride.findByPk(id);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.driverId !== req.user.id) {
      return res.status(403).json({ error: 'Only the driver can reject requests' });
    }

    const participant = await RideParticipant.findOne({
      where: { id: participantId, rideId: id }
    });

    if (!participant) {
      return res.status(404).json({ error: 'Join request not found' });
    }

    if (participant.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending requests can be rejected' });
    }

    await participant.update({ status: 'rejected' });
    return res.json({ message: 'Request rejected' });
  } catch (error) {
    console.error('Reject join request error:', error);
    return res.status(500).json({ error: 'Failed to reject join request' });
  }
};

// Cancel/withdraw a pending ride application (rider only)
exports.cancelRideApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const participant = await RideParticipant.findOne({
      where: {
        rideId: id,
        riderId: req.user.id,
        status: 'pending'
      }
    });

    if (!participant) {
      return res.status(404).json({ error: 'No pending application found to cancel' });
    }

    await participant.update({ status: 'expired' });
    return res.json({ message: 'Application cancelled' });
  } catch (error) {
    console.error('Cancel application error:', error);
    return res.status(500).json({ error: 'Failed to cancel application' });
  }
};

// Leave a ride
exports.leaveRide = async (req, res) => {
  try {
    const { id } = req.params;

    const ride = await Ride.findByPk(id);

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    const participant = await RideParticipant.findOne({
      where: {
        rideId: id,
        riderId: req.user.id,
        status: { [Op.in]: ['accepted', 'joined'] }
      }
    });

    if (!participant) {
      return res.status(400).json({ error: 'Not a participant of this ride' });
    }

    // Update participant status and increase available seats
    const seatsBooked = parseInt(participant.seatsBooked || 1) || 1;

    // Anti-spam: record rapid-leave events (best effort)
    try {
      const acceptedAt = new Date(participant.updatedAt || participant.createdAt || Date.now());
      const mins = (Date.now() - acceptedAt.getTime()) / (60 * 1000);
      const rapidLeaveMinutes = parseInt(process.env.RAPID_LEAVE_MINUTES || '10');
      if (!Number.isNaN(mins) && mins >= 0 && mins <= (Number.isNaN(rapidLeaveMinutes) ? 10 : rapidLeaveMinutes)) {
        recordRapidLeave({ userId: req.user.id });
      }
    } catch (e) {
      console.error('Rapid leave tracking failed:', e);
    }

    await participant.update({
      status: 'left',
      leftAt: new Date()
    });

    await ride.update({
      availableSeats: ride.availableSeats + seatsBooked
    });

    // Increment cancellation count
    await req.user.increment('cancellationCount');

    res.json({
      message: 'Successfully left the ride',
      ride
    });
  } catch (error) {
    console.error('Leave ride error:', error);
    res.status(500).json({ error: 'Failed to leave ride' });
  }
};

// Cancel a ride (driver only)
exports.cancelRide = async (req, res) => {
  try {
    const { id } = req.params;

    const ride = await Ride.findByPk(id);

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.driverId !== req.user.id) {
      return res.status(403).json({ error: 'Only the driver can cancel the ride' });
    }

    if (ride.status !== 'active') {
      return res.status(400).json({ error: 'Ride is not active' });
    }

    const before = ride.toJSON();

    await ride.update({ status: 'cancelled' });

    try {
      await writeAuditLog({
        action: 'ride.delete',
        actor: { id: req.user.id, username: req.user.username, role: req.user.role },
        rideId: ride.id,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        before,
        after: ride.toJSON(),
        meta: { method: 'cancel' }
      });
    } catch (auditError) {
      console.error('Audit log failed (ride.delete/cancel):', auditError);
    }

    // Increment driver's cancellation count
    await req.user.increment('cancellationCount');

    res.json({
      message: 'Ride cancelled successfully',
      ride
    });
  } catch (error) {
    console.error('Cancel ride error:', error);
    res.status(500).json({ error: 'Failed to cancel ride' });
  }
};

// Complete a ride (driver only)
exports.completeRide = async (req, res) => {
  try {
    const { id } = req.params;

    const ride = await Ride.findByPk(id);

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.driverId !== req.user.id) {
      return res.status(403).json({ error: 'Only the driver can complete the ride' });
    }

    if (ride.status !== 'active') {
      return res.status(400).json({ error: 'Ride is not active' });
    }

    await ride.update({ status: 'completed' });

    // Update all active participants to completed
    await RideParticipant.update(
      { status: 'completed' },
      {
        where: {
          rideId: id,
          status: { [Op.in]: ['accepted', 'joined'] }
        }
      }
    );

    res.json({
      message: 'Ride completed successfully',
      ride
    });
  } catch (error) {
    console.error('Complete ride error:', error);
    res.status(500).json({ error: 'Failed to complete ride' });
  }
};

// Get user's rides (as driver or rider)
exports.getUserRides = async (req, res) => {
  try {
    const { type = 'all' } = req.query; // 'driver', 'rider', or 'all'

    let driverRides = [];
    let riderRides = [];

    if (type === 'driver' || type === 'all') {
      driverRides = await Ride.findAll({
        where: { driverId: req.user.id },
        include: [
          {
            model: RideParticipant,
            as: 'participants',
            include: [
              {
                model: User,
                as: 'rider',
                attributes: ['id', 'username', 'profilePicture']
              }
            ]
          }
        ],
        order: [['rideDateTime', 'DESC']]
      });
    }

    if (type === 'rider' || type === 'all') {
      const participations = await RideParticipant.findAll({
        where: { riderId: req.user.id },
        include: [
          {
            model: Ride,
            as: 'ride',
            include: [
              {
                model: User,
                as: 'driver',
                attributes: ['id', 'username', 'profilePicture']
              }
            ]
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      riderRides = participations
        .filter(p => p.ride)
        .map(p => ({
          ...p.ride.toJSON(),
          participation: {
            id: p.id,
            status: p.status,
            seatsBooked: p.seatsBooked,
            joinedAt: p.joinedAt,
            leftAt: p.leftAt
          }
        }));
    }

    res.json({
      driverRides,
      riderRides
    });
  } catch (error) {
    console.error('Get user rides error:', error);
    res.status(500).json({ error: 'Failed to fetch user rides' });
  }
};
