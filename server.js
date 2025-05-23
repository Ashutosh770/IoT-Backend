require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Device Model
const deviceSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    unique: true
  },
  authToken: {
    type: String,
    required: true
  },
  name: String,
  location: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Device = mongoose.model('Device', deviceSchema);

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

// Authentication middleware
const authenticateDevice = async (req, res, next) => {
  const authToken = req.headers['x-auth-token'];
  const deviceId = req.body.deviceId;

  if (!authToken || !deviceId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const device = await Device.findOne({ deviceId, authToken });
    if (!device) {
      return res.status(401).json({ error: 'Invalid device credentials' });
    }
    req.device = device;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Root path
app.get('/', (req, res) => {
  res.json({ message: 'IoT Backend API is running' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const healthcheck = {
    status: 'UP',
    timestamp: new Date(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };
  res.json(healthcheck);
});

// Register new device
app.post('/api/devices/register', async (req, res) => {
  try {
    const { deviceId, name, location } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    // Generate a secure random token
    const authToken = crypto.randomBytes(32).toString('hex');

    const device = new Device({
      deviceId,
      authToken,
      name,
      location
    });

    await device.save();

    res.status(201).json({
      success: true,
      device: {
        deviceId: device.deviceId,
        authToken: device.authToken,
        name: device.name,
        location: device.location
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Device ID already registered' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// API Endpoints
app.post('/api/data', authenticateDevice, async (req, res) => {
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

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});