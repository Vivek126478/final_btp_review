const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { Ticket } = require('../models');
const PnrService = require('../services/pnrService');

// POST /api/tickets
// Create a new PNR tracker
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { pnr, type } = req.body;
    
    if (!pnr || !type || !['flight', 'railway'].includes(type)) {
      return res.status(400).json({ message: "Valid PNR and type ('flight', 'railway') required." });
    }

    // Call RapidAPI or our Fallback Mock
    let apiData;
    if (type === 'railway') {
      apiData = await PnrService.fetchTrainPNR(pnr);
    } else {
      apiData = await PnrService.fetchFlightPNR(pnr);
    }

    if (!apiData || !apiData.departureTime) {
      return res.status(400).json({ message: "Could not fetch API details for this PNR." });
    }

    // Invalidate any older active tickets for this user safely
    await Ticket.update({ status: 'CANCELLED' }, {
      where: { userId: req.user.id, status: 'ACTIVE' }
    });

    // Create the new ticket
    const newTicket = await Ticket.create({
      userId: req.user.id,
      pnr,
      type,
      departureStation: apiData.departureStation,
      destinationStation: apiData.destinationStation,
      departureTime: apiData.departureTime,
      status: 'ACTIVE'
    });

    res.status(201).json({
      message: "PNR successfully tracked!",
      ticket: newTicket
    });
  } catch (err) {
    console.error("POST /api/tickets Error:", err);
    res.status(500).json({ message: "Server error creating ticket." });
  }
});

// GET /api/tickets/active
// Returns the currently active ticket for the user (to map the 6-hour ride search buffer)
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      where: { userId: req.user.id, status: 'ACTIVE' },
      order: [['createdAt', 'DESC']]
    });

    if (!ticket) {
      return res.json({ ticket: null });
    }

    // If it's passed departure time, deactivate
    if (new Date(ticket.departureTime) < new Date()) {
      ticket.status = 'COMPLETED';
      await ticket.save();
      return res.json({ ticket: null });
    }

    res.json({ ticket });
  } catch (err) {
    console.error("GET /api/tickets/active Error:", err);
    res.status(500).json({ message: "Server error fetching active ticket." });
  }
});

module.exports = router;
