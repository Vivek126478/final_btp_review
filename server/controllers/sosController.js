const { SOSAlert, Ride, User } = require('../models');
const { sendSOSEmail } = require('../utils/emailService');

// Trigger SOS alert
exports.triggerSOS = async (req, res) => {
  try {
    const { rideId, location, latitude, longitude, message } = req.body;

    if (!rideId) {
      return res.status(400).json({ error: 'Ride ID is required' });
    }

    // Get ride details
    const ride = await Ride.findByPk(rideId, {
      include: [
        {
          model: User,
          as: 'host',
          attributes: ['id', 'username', 'email', 'phoneNumber']
        }
      ]
    });

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    // Create SOS alert
    const sosAlert = await SOSAlert.create({
      userId: req.user.id,
      rideId,
      location,
      latitude,
      longitude,
      message,
      status: 'active'
    });

    // Prepare SOS details
    const sosDetails = {
      alertId: sosAlert.id,
      userName: req.user.username,
      userEmail: req.user.email,
      userPhone: req.user.phoneNumber,
      driverName: ride.host.username,
      driverPhone: ride.host.phoneNumber,
      rideDetails: {
        startLocation: ride.startLocation,
        endLocation: ride.endLocation,
        rideDateTime: ride.rideDateTime
      },
      currentLocation: location,
      latitude,
      longitude,
      message,
      timestamp: new Date()
    };

    // Send SOS emails to emergency contacts
    try {
      await sendSOSEmail(sosDetails);
    } catch (emailError) {
      console.error('Failed to send SOS email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      message: 'SOS alert triggered successfully',
      alert: sosAlert
    });
  } catch (error) {
    console.error('Trigger SOS error:', error);
    res.status(500).json({ error: 'Failed to trigger SOS alert' });
  }
};

// Get SOS alerts
exports.getSOSAlerts = async (req, res) => {
  try {
    const { status } = req.query;

    const where = {};
    if (status) {
      where.status = status;
    }

    const alerts = await SOSAlert.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'phoneNumber']
        },
        {
          model: Ride,
          as: 'ride',
          include: [
            {
              model: User,
              as: 'host',
              attributes: ['id', 'username', 'phoneNumber']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ alerts });
  } catch (error) {
    console.error('Get SOS alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch SOS alerts' });
  }
};

// Resolve SOS alert
exports.resolveSOSAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['resolved', 'false_alarm'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const alert = await SOSAlert.findByPk(id);

    if (!alert) {
      return res.status(404).json({ error: 'SOS alert not found' });
    }

    await alert.update({
      status,
      resolvedAt: new Date()
    });

    res.json({
      message: 'SOS alert updated successfully',
      alert
    });
  } catch (error) {
    console.error('Resolve SOS alert error:', error);
    res.status(500).json({ error: 'Failed to resolve SOS alert' });
  }
};
