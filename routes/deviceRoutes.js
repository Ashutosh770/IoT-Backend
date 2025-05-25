const express = require('express');
const router = express.Router();
const { authenticateDevice } = require('../middleware/auth');
const Device = require('../models/device');

// Get device count and list
router.get('/count', authenticateDevice, async (req, res) => {
  try {
    const devices = await Device.find({}, {
      deviceId: 1,
      name: 1,
      location: 1,
      lastSeen: 1,
      _id: 0
    });

    res.json({
      success: true,
      count: devices.length,
      devices: devices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch device count',
      details: error.message
    });
  }
});

module.exports = router; 