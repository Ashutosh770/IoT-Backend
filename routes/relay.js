const express = require('express');
const router = express.Router();
const { authenticateDevice } = require('../middleware/auth');

// In-memory storage for relay states
const relayStates = new Map();

// POST relay control
router.post('/control', authenticateDevice, (req, res) => {
  const { deviceId, relay } = req.body;
  
  if (!deviceId || !relay) {
    return res.status(400).json({ error: 'Device ID and relay state are required' });
  }

  if (!['on', 'off'].includes(relay.toLowerCase())) {
    return res.status(400).json({ error: 'Relay state must be either "on" or "off"' });
  }

  relayStates.set(deviceId, relay.toLowerCase());
  res.json({
    success: true,
    deviceId,
    relay: relay.toLowerCase()
  });
});

module.exports = router; 