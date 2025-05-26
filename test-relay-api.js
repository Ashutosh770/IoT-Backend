import fetch from 'node-fetch';

const API_URL = 'https://iot-backend-dj8u.onrender.com/api';

// Test with existing devices
const TEST_DEVICES = [
  {
    deviceId: 'ESP32_001',
    name: 'Living Room Sensor',
    location: 'Living Room'
  },
  {
    deviceId: 'ESP32_002',
    name: 'Bhopal Green Technology park',
    location: 'Bhopal'
  }
];

async function testRelayAPI() {
    for (const device of TEST_DEVICES) {
        try {
            console.log(`\nTesting device: ${device.deviceId}`);
            console.log('----------------------------------------');

            // Step 1: Register/Re-register the device
            console.log('\n1. Registering device...');
            const registerResponse = await fetch(`${API_URL}/devices/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(device),
            });

            if (!registerResponse.ok) {
                throw new Error(`Registration failed: ${registerResponse.status}`);
            }

            const registerData = await registerResponse.json();
            console.log('Registration response:', registerData);

            if (!registerData.success || !registerData.device?.authToken) {
                throw new Error('Failed to get auth token from registration');
            }

            const authToken = registerData.device.authToken;
            console.log('Auth token received successfully');

            // Step 2: Test turning relay ON
            console.log('\n2. Testing relay ON...');
            const turnOnResponse = await fetch(`${API_URL}/relay/control`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': authToken
                },
                body: JSON.stringify({
                    deviceId: device.deviceId,
                    relay: 'on'
                }),
            });

            if (!turnOnResponse.ok) {
                throw new Error(`Turn ON failed: ${turnOnResponse.status}`);
            }

            const turnOnData = await turnOnResponse.json();
            console.log('Turn ON response:', turnOnData);

            // Wait for 2 seconds
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Step 3: Test turning relay OFF
            console.log('\n3. Testing relay OFF...');
            const turnOffResponse = await fetch(`${API_URL}/relay/control`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': authToken
                },
                body: JSON.stringify({
                    deviceId: device.deviceId,
                    relay: 'off'
                }),
            });

            if (!turnOffResponse.ok) {
                throw new Error(`Turn OFF failed: ${turnOffResponse.status}`);
            }

            const turnOffData = await turnOffResponse.json();
            console.log('Turn OFF response:', turnOffData);

            console.log('\nDevice test completed successfully!');
            console.log('Device ID:', device.deviceId);
            console.log('Auth Token:', authToken);
            console.log('----------------------------------------');

        } catch (error) {
            console.error(`\nTest failed for device ${device.deviceId}:`, error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response headers:', error.response.headers);
            }
        }
    }
}

// Run the test
testRelayAPI(); 