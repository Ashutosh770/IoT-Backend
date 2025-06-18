import express from 'express';
import { authenticateDevice } from '../middleware/auth.js';
import Device from '../models/device.js';

const router = express.Router();

// In-memory storage for relay states
// Structure: Map<deviceId, {relay1: state, relay2: state, relay3: state, relay4: state}>
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

    const currentStates = relayStates.get(deviceId) || {
      relay1: 'off',
      relay2: 'off',
      relay3: 'off',
      relay4: 'off'
    };
    
    res.json({
      success: true,
      deviceId,
      relays: currentStates
    });
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' });
  }
});

// POST relay control
router.post('/control', authenticateDevice, (req, res) => {
  const { deviceId, relayNumber, state } = req.body;
  
  if (!deviceId || !relayNumber || !state) {
    return res.status(400).json({ error: 'Device ID, relay number, and state are required' });
  }

  if (![1, 2, 3, 4].includes(relayNumber)) {
    return res.status(400).json({ error: 'Relay number must be between 1 and 4' });
  }

  if (!['on', 'off'].includes(state.toLowerCase())) {
    return res.status(400).json({ error: 'Relay state must be either "on" or "off"' });
  }

  // Get current states or initialize with defaults
  const currentStates = relayStates.get(deviceId) || {
    relay1: 'off',
    relay2: 'off',
    relay3: 'off',
    relay4: 'off'
  };

  // Update the specific relay state
  currentStates[`relay${relayNumber}`] = state.toLowerCase();
  relayStates.set(deviceId, currentStates);

  res.json({
    success: true,
    deviceId,
    relays: currentStates
  });
});

export default router; 