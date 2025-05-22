#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Backend API configuration
const char* serverUrl = "https://iot-backend-dj8u.onrender.com";
const char* deviceId = "ESP32_001";  // Change this to a unique ID for each device
const char* authToken = "YOUR_AUTH_TOKEN";  // Get this from device registration

// DHT sensor configuration
#define DHTPIN 4     // DHT sensor pin
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// Timing configuration
const unsigned long SEND_INTERVAL = 300000;  // Send data every 5 minutes
unsigned long lastSendTime = 0;

void setup() {
  Serial.begin(115200);
  
  // Initialize DHT sensor
  dht.begin();
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nConnected to WiFi");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi connection lost. Reconnecting...");
    WiFi.begin(ssid, password);
    delay(5000);
    return;
  }

  // Check if it's time to send data
  if (millis() - lastSendTime >= SEND_INTERVAL) {
    // Read sensor data
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();

    // Check if sensor readings are valid
    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("Failed to read from DHT sensor!");
      return;
    }

    // Create JSON document
    StaticJsonDocument<200> doc;
    doc["deviceId"] = deviceId;
    doc["temperature"] = temperature;
    doc["humidity"] = humidity;

    String jsonString;
    serializeJson(doc, jsonString);

    // Send data to server
    if (sendData(jsonString)) {
      Serial.println("Data sent successfully");
      lastSendTime = millis();
    } else {
      Serial.println("Failed to send data");
    }
  }
}

bool sendData(String jsonData) {
  HTTPClient http;
  
  // Configure the request
  http.begin(serverUrl + String("/api/data"));
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-auth-token", authToken);
  
  // Send POST request
  int httpResponseCode = http.POST(jsonData);
  
  // Check response
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("HTTP Response code: " + String(httpResponseCode));
    Serial.println("Response: " + response);
    http.end();
    return true;
  } else {
    Serial.println("Error on sending POST: " + String(httpResponseCode));
    http.end();
    return false;
  }
} 