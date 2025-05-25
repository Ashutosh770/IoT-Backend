const express = require('express');
const router = express.Router();
const { authenticateDevice } = require('../middleware/auth');
const Device = require('../models/device');
const SensorData = require('../models/SensorData');

// Get device count and list
router.get('/count', async (req, res) => {
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

module.exports = router; 