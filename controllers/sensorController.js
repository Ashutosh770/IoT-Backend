const SensorData = require('../models/SensorData');

// Save sensor data
exports.saveData = async (req, res) => {
  try {
    const { deviceId, temperature, humidity } = req.body;
    
    const newData = new SensorData({
      deviceId,
      temperature,
      humidity
    });

    await newData.save();
    res.status(201).json({ success: true, data: newData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all sensor data
exports.getAllData = async (req, res) => {
  try {
    const data = await SensorData.find().sort({ timestamp: -1 });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get latest reading
exports.getLatestData = async (req, res) => {
  try {
    const data = await SensorData.findOne().sort({ timestamp: -1 });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};