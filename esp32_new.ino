#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <time.h>

// WiFi Credentials
const char* ssid = "Ashutosh's S21 FE";
const char* password = "12341234";

// Backend Config
const char* serverUrl = "https://iot-backend-dj8u.onrender.com";
const char* deviceId = "ESP32_002";
const char* authToken = "e40bc5ff723663397dd4060807d255cbc74cb72507e72184b6243093fce20123"; // Replace with the actual token for ESP32_002

// Sensor Config
#define DHTPIN 4          // GPIO4 for DHT22
#define DHTTYPE DHT22     // DHT22 Sensor
DHT dht(DHTPIN, DHTTYPE);

// Relay Config
#define RELAY_PIN 2       // GPIO2 connected to relay

// Time Sync
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 0;
const int daylightOffset_sec = 3600;

// Timing
const unsigned long SEND_INTERVAL = 30000; // Send data and check relay every 30 seconds
unsigned long lastSendTime = 0;

void setup() {
  Serial.begin(115200);
  delay(2000);

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW); // Start relay OFF

  dht.begin();
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected");

  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  while (!time(nullptr)) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println("\nTime synchronized.");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    // Simple reconnect logic, might need more robust handling in production
    WiFi.disconnect();
    delay(1000);
    WiFi.begin(ssid, password);
    delay(5000); // Give it some time to connect
    return;
  }

  unsigned long currentTime = millis();
  if (currentTime - lastSendTime >= SEND_INTERVAL) {
    float temperature = NAN, humidity = NAN;

    // Try reading sensor data multiple times
    for (int i = 0; i < 5; i++) { // Increased retry attempts
      temperature = dht.readTemperature();
      humidity = dht.readHumidity();
      if (!isnan(temperature) && !isnan(humidity)) break;
      Serial.println("Retrying sensor read...");
      delay(1000); // Wait a bit before retrying
    }

    if (!isnan(temperature) && !isnan(humidity)) {
      sendDataToBackend(temperature, humidity);
      checkAndControlRelay();  // relay control after sending data
      lastSendTime = currentTime;
    } else {
      Serial.println("Failed to read sensor data after multiple attempts.");
    }
  }
}

void sendDataToBackend(float temp, float hum) {
  WiFiClientSecure client;
  client.setInsecure(); // Note: Disables certificate validation. Use trusted certs in production.
  HTTPClient http;

  String endpoint = String(serverUrl) + "/api/data";
  Serial.print("Sending data to: "); Serial.println(endpoint);

  http.begin(client, endpoint);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-auth-token", authToken);

  StaticJsonDocument<200> doc;
  doc["deviceId"] = deviceId;
  doc["temperature"] = temp;
  doc["humidity"] = hum;
  String jsonData;
  serializeJson(doc, jsonData);

  Serial.print("Request Body: "); Serial.println(jsonData);

  int responseCode = http.POST(jsonData);
  String payload = http.getString();

  Serial.print("POST /api/data Response Code: "); Serial.println(responseCode);
  Serial.print("POST /api/data Response: "); Serial.println(payload);

  http.end();
}

void checkAndControlRelay() {
  WiFiClientSecure client;
  client.setInsecure(); // Note: Disables certificate validation. Use trusted certs in production.
  HTTPClient http;

  // CORRECTED URL
  String url = String(serverUrl) + "/api/relay/status?deviceId=" + deviceId;
  Serial.print("Checking relay status from: "); Serial.println(url);

  http.begin(client, url);
  http.addHeader("x-auth-token", authToken);

  int responseCode = http.GET();
  String payload = http.getString();

  Serial.print("GET /api/relay/status Response Code: "); Serial.println(responseCode);
  Serial.print("GET /api/relay/status Response: "); Serial.println(payload);

  if (responseCode == 200) {
    StaticJsonDocument<128> doc;
    DeserializationError error = deserializeJson(doc, payload);

    if (!error) {
      if (doc.containsKey("relay")) {
          String relayState = doc["relay"].as<String>(); // Use as<String>() for safety
          if (relayState == "on") {
              digitalWrite(RELAY_PIN, HIGH);
              Serial.println("Relay state set to: on");
          } else if (relayState == "off") {
              digitalWrite(RELAY_PIN, LOW);
              Serial.println("Relay state set to: off");
          } else {
               Serial.print("Received invalid relay state: "); Serial.println(relayState);
          }
      } else {
          Serial.println("Response missing 'relay' key.");
      }
    } else {
      Serial.print("Failed to parse relay status JSON: "); Serial.println(error.c_str());
    }
  } else if (responseCode == 401) {
      Serial.println("Authentication failed for relay status GET. Check deviceId and authToken.");
  } else if (responseCode == 400) {
      Serial.println("Bad request for relay status GET. Check deviceId in query.");
  }
  else {
    Serial.print("Relay GET failed with response code: "); Serial.println(responseCode);
  }
  http.end();
}