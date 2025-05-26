import mongoose from 'mongoose';

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

export default SensorData;