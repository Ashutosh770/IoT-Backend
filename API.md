# IoT Backend API Documentation

This document provides comprehensive documentation for all available API endpoints in the IoT Backend system.

## Base URL

```
https://iot-backend-dj8u.onrender.com
```

## Authentication

Most endpoints require authentication using an `x-auth-token` header. This token is obtained during device registration.

## API Endpoints

### 1. Device Registration

Register a new device to get an authentication token.

```
POST /api/devices/register
Content-Type: application/json

Request Body:
{
  "deviceId": "YOUR_DEVICE_ID",
  "name": "Device Name",
  "location": "Device Location"
}

Response (201 Created):
{
  "success": true,
  "device": {
    "deviceId": "YOUR_DEVICE_ID",
    "authToken": "YOUR_AUTH_TOKEN",
    "name": "Device Name",
    "location": "Device Location"
  }
}
```

### 2. Sensor Data Endpoints

#### 2.1 Send Sensor Data

Send temperature and humidity readings from your device.

```
POST /api/data
Content-Type: application/json
x-auth-token: YOUR_AUTH_TOKEN

Request Body:
{
  "deviceId": "YOUR_DEVICE_ID",
  "temperature": 25.5,  // Range: -40°C to 80°C
  "humidity": 60.0      // Range: 0% to 100%
}

Response (201 Created):
{
  "success": true,
  "data": {
    "deviceId": "YOUR_DEVICE_ID",
    "temperature": 25.5,
    "humidity": 60.0,
    "timestamp": "2024-03-21T10:30:00.000Z"
  }
}
```

#### 2.2 Get Latest Sensor Data

Retrieve the most recent sensor reading.

```
GET /api/data/latest

Response (200 OK):
{
  "success": true,
  "data": {
    "deviceId": "YOUR_DEVICE_ID",
    "temperature": 25.5,
    "humidity": 60.0,
    "timestamp": "2024-03-21T10:30:00.000Z"
  }
}
```

#### 2.3 Get All Sensor Data

Retrieve all sensor readings, sorted by timestamp in descending order.

```
GET /api/data

Response (200 OK):
{
  "success": true,
  "data": [
    {
      "deviceId": "YOUR_DEVICE_ID",
      "temperature": 25.5,
      "humidity": 60.0,
      "timestamp": "2024-03-21T10:30:00.000Z"
    },
    // ... more readings
  ]
}
```

#### 2.4 Get Latest Data for Specific Device

Retrieve the most recent sensor reading for a specific device.

```
GET /api/devices/{deviceId}/latest

Response (200 OK):
{
  "success": true,
  "data": {
    "deviceId": "YOUR_DEVICE_ID",
    "temperature": 25.5,
    "humidity": 60.0,
    "timestamp": "2024-03-21T10:30:00.000Z"
  }
}
```

#### 2.5 Get History Data for Specific Device

Retrieve historical sensor readings for a specific device.

```
GET /api/devices/{deviceId}/history

Response (200 OK):
{
  "success": true,
  "data": [
    {
      "deviceId": "YOUR_DEVICE_ID",
      "temperature": 25.5,
      "humidity": 60.0,
      "timestamp": "2024-03-21T10:30:00.000Z"
    },
    // ... more readings
  ]
}
```

### 3. Relay Control Endpoint

Control the relay state for a device.

```
POST /api/relay/control
Content-Type: application/json
x-auth-token: YOUR_AUTH_TOKEN

Request Body:
{
  "deviceId": "YOUR_DEVICE_ID",
  "relay": "on"  // or "off"
}

Response (200 OK):
{
  "success": true,
  "deviceId": "YOUR_DEVICE_ID",
  "relay": "on"  // or "off"
}
```

Note: This endpoint is used to send control commands to devices. The relay state is maintained in memory and will be reset when the server restarts.

### 4. Device Management Endpoints

#### 4.1 Get Device Count

Get the total number of registered devices in the system. This endpoint is publicly accessible and doesn't require authentication.

```
GET /api/devices/count

Response (200 OK):
{
  "success": true,
  "count": 5,
  "devices": [
    {
      "deviceId": "DEVICE_1",
      "name": "Living Room Sensor",
      "location": "Living Room",
      "lastSeen": "2024-03-21T10:30:00.000Z"
    },
    // ... more devices
  ]
}
```

Note: This endpoint returns basic device information without sensitive data like authentication tokens.

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Missing required fields"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```
or
```json
{
  "error": "Invalid device credentials"
}
```

### 500 Internal Server Error
```json
{
  "error": "Server error",
  "details": "Error message details"
}
```

## Data Validation

- Temperature must be between -40°C and 80°C
- Humidity must be between 0% and 100%
- Device IDs must be unique
- Relay states must be either "on" or "off"

## Security Notes

1. Always use HTTPS for all API calls
2. Keep your authentication token secure
3. Never share your device credentials
4. Implement proper error handling in your client applications
5. Consider implementing rate limiting for your devices

## Example Usage

### ESP32/ESP8266 Arduino Code

```cpp
// Example of sending sensor data
void sendDataToBackend(float temp, float hum) {
  HTTPClient http;
  WiFiClientSecure client;
  client.setInsecure(); // Note: Use proper certificate validation in production
  
  String endpoint = String(serverUrl) + "/api/data";
  http.begin(client, endpoint);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-auth-token", authToken);

  StaticJsonDocument<200> doc;
  doc["deviceId"] = deviceId;
  doc["temperature"] = temp;
  doc["humidity"] = hum;
  String jsonData;
  serializeJson(doc, jsonData);

  int responseCode = http.POST(jsonData);
  String payload = http.getString();
  http.end();
}
``` 