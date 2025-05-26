import express from 'express';
import { authenticateDevice } from '../middleware/auth.js';
import Device from '../models/device.js';

const router = express.Router();

// In-memory storage for relay states
const relayStates = new Map();

// GET relay status
router.get('/status/:deviceId', async (req, res) => {
  const { deviceId } = req.params;
  const authToken = req.headers['x-auth-token'];
  
  if (!deviceId || !authToken) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Verify device authentication
    const device = await Device.findOne({ deviceId, authToken });
    if (!device) {
      return res.status(401).json({ error: 'Invalid device credentials' });
    }

    const currentState = relayStates.get(deviceId) || 'off';
    
    res.json({
      success: true,
      deviceId,
      relay: currentState
    });
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' });
  }
});

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