const express = require('express');
const router = express.Router();
const { authenticateDevice } = require('../middleware/auth');

// In-memory storage for relay states
const relayStates = new Map();

// GET relay status
router.get('/status', authenticateDevice, (req, res) => {
  const { deviceId } = req.query;
  
  if (!deviceId) {
    return res.status(400).json({ error: 'Device ID is required' });
  }

  const state = relayStates.get(deviceId) || 'off';
  res.json({
    success: true,
    deviceId,
    relay: state
  });
});

// POST relay status
router.post('/status', authenticateDevice, (req, res) => {
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