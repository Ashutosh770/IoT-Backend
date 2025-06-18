import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
import relayRoutes from './routes/relay.js';
import deviceRoutes from './routes/deviceRoutes.js';

// Import models
import Device from './models/device.js';
import SensorData from './models/SensorData.js';

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

    // Check if device already exists
    let device = await Device.findOne({ deviceId });
    
    if (device) {
      // If device exists, generate a new auth token
      device.authToken = crypto.randomBytes(32).toString('hex');
      device.lastSeen = new Date();
      await device.save();
    } else {
      // Generate a secure random token for new device
      const authToken = crypto.randomBytes(32).toString('hex');
      
      device = new Device({
        deviceId,
        authToken,
        name,
        location,
        lastSeen: new Date()
      });

      await device.save();
    }

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
    console.error('Device registration error:', error);
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
    const { deviceId, temperature, humidity, soilMoisture } = req.body;
    
    // Validation
    if (!deviceId || temperature == null || humidity == null) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create and save new record
    const newData = new SensorData({
      deviceId,
      temperature,
      humidity,
      ...(soilMoisture !== undefined && { soilMoisture })
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

// Use routes
app.use('/api/relay', relayRoutes);
app.use('/api/devices', deviceRoutes);

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