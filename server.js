require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/iot_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Sensor Data Model
const sensorDataSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true
  },
  temperature: {
    type: Number,
    required: true,
    min: -40,   // DHT11 minimum
    max: 80     // DHT11 maximum
  },
  humidity: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const SensorData = mongoose.model('SensorData', sensorDataSchema);

// API Endpoints
app.post('/api/data', async (req, res) => {
  try {
    const { deviceId, temperature, humidity } = req.body;
    
    // Validation
    if (!deviceId || temperature == null || humidity == null) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create and save new record
    const newData = new SensorData({
      deviceId,
      temperature,
      humidity
    });

    await newData.save();
    
    res.status(201).json({
      success: true,
      data: newData
    });

  } catch (error) {
    console.error("Error saving data:", error);
    res.status(500).json({ 
      error: "Server error",
      details: error.message 
    });
  }
});

app.get('/api/data/latest', async (req, res) => {
  try {
    const data = await SensorData.findOne()
      .sort({ timestamp: -1 });
      
    res.json(data || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});