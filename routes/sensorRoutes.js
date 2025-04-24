const express = require('express');
const router = express.Router();
const { 
  saveData, 
  getAllData, 
  getLatestData 
} = require('../controllers/sensorController');

// POST - Save sensor data from device
router.post('/data', saveData);

// GET - Retrieve all sensor data
router.get('/data', getAllData);

// GET - Get latest sensor reading
router.get('/data/latest', getLatestData);

module.exports = router;