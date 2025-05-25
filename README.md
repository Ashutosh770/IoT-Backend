# IoT Temperature and Humidity Monitoring System

This project implements a complete IoT system for monitoring temperature and humidity using an ESP32 microcontroller and a cloud backend. The system allows remote monitoring of environmental conditions from anywhere with internet access.

## System Components

1. **Hardware**
   - ESP32 microcontroller
   - DHT11 temperature and humidity sensor
   - Power supply for ESP32
   - Jumper wires

2. **Software**
   - Node.js backend (hosted on Render)
   - MongoDB database (hosted on MongoDB Atlas)
   - ESP32 Arduino code

## Setup Instructions

### 1. Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd iot-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   Create a `.env` file in the root directory with:
   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/
   PORT=3000
   ```

4. **Deploy to Render**
   - Create a new Web Service on Render
   - Connect your GitHub repository
   - Add environment variables in Render dashboard
   - Deploy the service

### 2. Device Registration

1. **Register your ESP32 device**
   ```powershell
   $response = Invoke-RestMethod -Method Post -Uri "https://your-render-url.onrender.com/api/devices/register" -ContentType "application/json" -Body '{"deviceId":"ESP32_001","name":"Living Room Sensor","location":"Living Room"}'
   $response | ConvertTo-Json
   ```

2. **Save the auth token**
   - Copy the `authToken` from the response
   - You'll need this for the ESP32 code

### 3. ESP32 Setup

1. **Hardware Connections**
   - Connect DHT11 sensor to ESP32:
     - VCC to 3.3V
     - GND to GND
     - DATA to GPIO 4

2. **Software Setup**
   - Install required libraries in Arduino IDE:
     - WiFi.h (built into ESP32 board support)
     - HTTPClient.h (built into ESP32 board support)
     - DHT sensor library by Adafruit
     - ArduinoJson by Benoit Blanchon

3. **Update ESP32 Code**
   - Open `esp32_sensor.ino`
   - Update the following variables:
     ```cpp
     const char* ssid = "YOUR_WIFI_SSID";
     const char* password = "YOUR_WIFI_PASSWORD";
     const char* deviceId = "ESP32_001";  // Match the ID used in registration
     const char* authToken = "YOUR_AUTH_TOKEN";  // From device registration
     ```

4. **Upload Code**
   - Select ESP32 board in Arduino IDE
   - Upload the code to ESP32

## API Endpoints

1. **Device Registration**
   ```
   POST /api/devices/register
   Content-Type: application/json
   
   {
     "deviceId": "ESP32_001",
     "name": "Living Room Sensor",
     "location": "Living Room"
   }
   ```

2. **Send Sensor Data**
   ```
   POST /api/data
   Content-Type: application/json
   x-auth-token: YOUR_AUTH_TOKEN
   
   {
     "deviceId": "ESP32_001",
     "temperature": 25.5,
     "humidity": 60.0
   }
   ```

3. **Get Latest Data**
   ```
   GET /api/data/latest
   ```

4. **Health Check**
   ```
   GET /api/health
   ```

## Security Features

1. **Device Authentication**
   - Each device has a unique auth token
   - All data requests must include the auth token
   - Tokens are validated on every request

2. **HTTPS Communication**
   - All API endpoints are served over HTTPS
   - Secure communication between ESP32 and backend

3. **Data Validation**
   - Temperature range: -40°C to 80°C
   - Humidity range: 0% to 100%
   - Required fields validation

## Troubleshooting

1. **ESP32 Connection Issues**
   - Check WiFi credentials
   - Verify auth token is correct
   - Check serial monitor for error messages

2. **Backend Issues**
   - Check Render deployment logs
   - Verify MongoDB connection
   - Check environment variables

3. **Data Not Being Received**
   - Check ESP32 serial output
   - Verify API endpoint URL
   - Check MongoDB connection

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the ISC License. 