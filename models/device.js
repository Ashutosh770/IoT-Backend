import mongoose from 'mongoose';

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
  lastSeen: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Device = mongoose.model('Device', deviceSchema);

export default Device; 