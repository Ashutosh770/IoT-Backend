import express from 'express';
import { authenticateDevice } from '../middleware/auth.js';
import Device from '../models/device.js';
import SensorData from '../models/SensorData.js';

const router = express.Router();

// Get device count and list with auth tokens
router.get('/count', async (req, res) => {
  try {
    const devices = await Device.find({}, {
      deviceId: 1,
      name: 1,
      location: 1,
      lastSeen: 1,
      authToken: 1,
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

// Get device details with auth token
router.get('/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    const device = await Device.findOne({ deviceId }, {
      deviceId: 1,
      name: 1,
      location: 1,
      lastSeen: 1,
      authToken: 1,
      _id: 0
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    res.json({
      success: true,
      device: device
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch device details',
      details: error.message
    });
  }
});

// Get latest data for specific device
router.get('/:deviceId/latest', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    const latestData = await SensorData.findOne({ deviceId })
      .sort({ timestamp: -1 });

    if (!latestData) {
      return res.status(404).json({
        success: false,
        error: 'No data found for this device'
      });
    }

    res.json({
      success: true,
      data: latestData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch latest data',
      details: error.message
    });
  }
});

// Get history data for specific device
router.get('/:deviceId/history', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 100 } = req.query; // Default to last 100 readings
    
    const historyData = await SensorData.find({ deviceId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: historyData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch history data',
      details: error.message
    });
  }
});

export default router; 