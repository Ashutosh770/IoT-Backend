const axios = require('axios');
require('dotenv').config();

// Configuration
const API_URL = `http://localhost:${process.env.PORT || 3000}/api/data`;
const DEVICE_ID = "VIRTUAL_DEVICE_1";
const INTERVAL_MS = 5000; // 5 seconds

// Simulate realistic sensor values
function generateSensorData() {
  const baseTemp = 22; // Base temperature in °C
  const baseHumidity = 55; // Base humidity in %
  
  return {
    temperature: parseFloat((baseTemp + (Math.random() * 6 - 3)).toFixed(1)), // ±3°C variation
    humidity: parseFloat((baseHumidity + (Math.random() * 10 - 5)).toFixed(1)), // ±5% variation
    timestamp: new Date().toISOString()
  };
}

async function sendData() {
  try {
    const { temperature, humidity } = generateSensorData();
    
    const response = await axios.post(API_URL, {
      deviceId: DEVICE_ID,
      temperature,
      humidity
    });

    console.log(`[${new Date().toLocaleTimeString()}] Sent: ${temperature}°C, ${humidity}%`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

// Start simulation
console.log(`Starting IoT simulator for ${DEVICE_ID}...`);
console.log(`POSTing to: ${API_URL}\n`);

setInterval(sendData, INTERVAL_MS);

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\nSimulator stopped');
  process.exit();
});