import express from 'express';
import { authenticateDevice } from '../middleware/auth.js';

const router = express.Router();

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

export default router; 