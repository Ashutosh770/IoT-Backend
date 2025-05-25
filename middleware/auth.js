const Device = require('../models/device');

const authenticateDevice = async (req, res, next) => {
  const authToken = req.headers['x-auth-token'];
  const deviceId = req.body.deviceId || req.query.deviceId;

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

module.exports = {
  authenticateDevice
}; 