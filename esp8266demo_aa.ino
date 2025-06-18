#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <time.h>

// Debug flags
#define DEBUG_SENSOR true
#define DEBUG_RELAY true

// WiFi Credentials
const char* ssid = "Ashutosh's S21 FE";
const char* password = "12341234";

// Backend Config
const char* serverUrl = "https://iot-backend-dj8u.onrender.com";
const char* deviceId = "ESP32_002";
const char* authToken = "e40bc5ff723663397dd4060807d255cbc74cb72507e72184b6243093fce20123";

// ESP8266 Pin Configuration (using GPIO numbers)
#define DHTPIN 2          // GPIO2 (D4) for DHT22
#define DHTTYPE DHT11     // DHT11 Sensor
#define RELAY_PIN 5       // GPIO5 (D1) for Relay
#define WIFI_LED 4        // GPIO4 (D2) for WiFi status LED
#define SENSOR_LED 0      // GPIO0 (D3) for Sensor reading LED

// Sensor Config
DHT dht(DHTPIN, DHTTYPE);

// Relay Config
bool currentRelayState = false;  // Track relay state locally

// Time Sync
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 0;
const int daylightOffset_sec = 3600;

// Timing
const unsigned long SEND_INTERVAL = 30000;    // 30 seconds for sensor data
const unsigned long RELAY_CHECK_INTERVAL = 5000;  // 5 seconds for relay check
unsigned long lastSendTime = 0;
unsigned long lastRelayCheck = 0;

void setup() {
  Serial.begin(115200);
  delay(2000);
  Serial.println("\n\n=== ESP8266 IoT Device Starting ===");

  // Initialize pins
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(WIFI_LED, OUTPUT);
  pinMode(SENSOR_LED, OUTPUT);
  
  // Start with all outputs LOW
  digitalWrite(RELAY_PIN, HIGH);  // Start with relay OFF
  digitalWrite(WIFI_LED, LOW);
  digitalWrite(SENSOR_LED, LOW);

  // Initialize DHT sensor
  dht.begin();
  Serial.println("DHT sensor initialized");
  
  // Connect to WiFi
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    digitalWrite(WIFI_LED, !digitalRead(WIFI_LED)); // Blink WiFi LED while connecting
  }
  digitalWrite(WIFI_LED, HIGH); // Solid ON when connected
  Serial.println("\nWiFi Connected");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // Sync time
  Serial.print("Syncing time with ");
  Serial.println(ntpServer);
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  while (!time(nullptr)) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println("\nTime synchronized");

  // Initial relay state
  Serial.println("\nSetting initial relay state...");
  controlRelay(false);  // Start with relay OFF
  
  Serial.println("Setup complete!");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    digitalWrite(WIFI_LED, LOW);
    WiFi.begin(ssid, password);
    delay(5000);
    return;
  }

  // Check relay status every 5 seconds
  if (millis() - lastRelayCheck >= RELAY_CHECK_INTERVAL) {
    checkRelayStatus();
    lastRelayCheck = millis();
  }

  // Sensor data sending
  if (millis() - lastSendTime >= SEND_INTERVAL) {
    if (DEBUG_SENSOR) Serial.println("\n=== SENSOR READING ===");
    float temperature = NAN, humidity = NAN;

    digitalWrite(SENSOR_LED, HIGH);
    
    for (int i = 0; i < 3; i++) {
      temperature = dht.readTemperature();
      humidity = dht.readHumidity();
      if (!isnan(temperature) && !isnan(humidity)) break;
      delay(2000);
    }

    digitalWrite(SENSOR_LED, LOW);

    if (!isnan(temperature) && !isnan(humidity)) {
      if (DEBUG_SENSOR) {
        Serial.print("Temperature: ");
        Serial.print(temperature);
        Serial.print("°C, Humidity: ");
        Serial.print(humidity);
        Serial.println("%");
      }
      sendDataToBackend(temperature, humidity);
      lastSendTime = millis();
    } else {
      Serial.println("Failed to read sensor data.");
    }
  }
}

void sendDataToBackend(float temp, float hum) {
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  String endpoint = String(serverUrl) + "/api/data";
  if (DEBUG_SENSOR) {
    Serial.print("Sending data to: ");
    Serial.println(endpoint);
  }

  http.begin(client, endpoint);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-auth-token", authToken);

  StaticJsonDocument<200> doc;
  doc["deviceId"] = deviceId;
  doc["temperature"] = temp;
  doc["humidity"] = hum;
  String jsonData;
  serializeJson(doc, jsonData);

  if (DEBUG_SENSOR) {
    Serial.print("Request body: ");
    Serial.println(jsonData);
  }

  int response = http.POST(jsonData);
  if (DEBUG_SENSOR) {
    Serial.print("POST /api/data => ");
    Serial.println(response);
    Serial.println(http.getString());
  }
  http.end();
}

void controlRelay(bool state) {
  if (DEBUG_RELAY) {
    Serial.println("\n=== RELAY CONTROL ===");
    Serial.print("Current relay state: "); 
    Serial.println(currentRelayState ? "ON" : "OFF");
    Serial.print("Requested state: "); 
    Serial.println(state ? "ON" : "OFF");
  }
  
  if (state == currentRelayState) {
    if (DEBUG_RELAY) {
      Serial.println("Relay state unchanged, skipping API call");
      Serial.print("Physical relay pin (GPIO"); 
      Serial.print(RELAY_PIN); 
      Serial.print(") is: "); 
      Serial.println(digitalRead(RELAY_PIN) ? "HIGH" : "LOW");
    }
    return;
  }
  
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  String endpoint = String(serverUrl) + "/api/relay/control";
  if (DEBUG_RELAY) {
    Serial.print("Sending request to: "); 
    Serial.println(endpoint);
  }
  
  http.begin(client, endpoint);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-auth-token", authToken);

  StaticJsonDocument<200> doc;
  doc["deviceId"] = deviceId;
  doc["relay"] = state ? "on" : "off";
  String jsonData;
  serializeJson(doc, jsonData);
  
  if (DEBUG_RELAY) {
    Serial.print("Request body: "); 
    Serial.println(jsonData);
  }

  int response = http.POST(jsonData);
  if (DEBUG_RELAY) {
    Serial.print("POST /api/relay/control => "); 
    Serial.println(response);
  }
  
  if (response == 200) {
    String responseBody = http.getString();
    if (DEBUG_RELAY) {
      Serial.print("Response body: "); 
      Serial.println(responseBody);
    }
    
    StaticJsonDocument<200> responseDoc;
    DeserializationError error = deserializeJson(responseDoc, responseBody);
    
    if (!error && responseDoc["success"] == true) {
      currentRelayState = state;
      // Invert the logic here - LOW turns ON, HIGH turns OFF
      digitalWrite(RELAY_PIN, state ? LOW : HIGH);
      if (DEBUG_RELAY) {
        Serial.println("\nRelay state updated successfully:");
        Serial.print("- Requested state: "); 
        Serial.println(state ? "ON" : "OFF");
        Serial.print("- Current state: "); 
        Serial.println(currentRelayState ? "ON" : "OFF");
        Serial.print("- Physical pin (GPIO"); 
        Serial.print(RELAY_PIN); 
        Serial.print("): "); 
        Serial.println(digitalRead(RELAY_PIN) ? "HIGH" : "LOW");
      }
    } else {
      if (DEBUG_RELAY) {
        Serial.println("\nFailed to update relay state:");
        if (error) {
          Serial.print("- JSON parse error: "); 
          Serial.println(error.c_str());
        } else {
          Serial.println("- Invalid response format or success=false");
        }
        Serial.print("- Response body: "); 
        Serial.println(responseBody);
      }
    }
  } else {
    if (DEBUG_RELAY) {
      Serial.println("\nFailed to control relay:");
      Serial.print("- Response code: "); 
      Serial.println(response);
      String responseBody = http.getString();
      Serial.print("- Response body: "); 
      Serial.println(responseBody);
      Serial.print("- Current state: "); 
      Serial.println(currentRelayState ? "ON" : "OFF");
      Serial.print("- Physical pin (GPIO"); 
      Serial.print(RELAY_PIN); 
      Serial.print("): "); 
      Serial.println(digitalRead(RELAY_PIN) ? "HIGH" : "LOW");
    }
  }
  http.end();
}

void checkRelayStatus() {
  if (DEBUG_RELAY) {
    Serial.println("\n=== CHECKING RELAY STATUS ===");
  }
  
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  String endpoint = String(serverUrl) + "/api/relay/status/" + deviceId;
  if (DEBUG_RELAY) {
    Serial.print("Checking status from: "); 
    Serial.println(endpoint);
  }
  
  http.begin(client, endpoint);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-auth-token", authToken);

  int response = http.GET();
  if (DEBUG_RELAY) {
    Serial.print("GET /api/relay/status/"); 
    Serial.print(deviceId);
    Serial.print(" => "); 
    Serial.println(response);
  }
  
  if (response == 200) {
    String responseBody = http.getString();
    if (DEBUG_RELAY) {
      Serial.print("Response body: "); 
      Serial.println(responseBody);
    }
    
    StaticJsonDocument<200> responseDoc;
    DeserializationError error = deserializeJson(responseDoc, responseBody);
    
    if (!error && responseDoc["success"] == true) {
      String relayState = responseDoc["relay"].as<String>();
      
      // Directly control relay based on state
      if (relayState == "on") {
        digitalWrite(RELAY_PIN, LOW);  // LOW turns ON for relay
        if (DEBUG_RELAY) {
          Serial.println("\nRelay turned ON:");
          Serial.print("- Virtual state: ON");
          Serial.print("- Physical pin (GPIO"); 
          Serial.print(RELAY_PIN); 
          Serial.print(") set to: LOW");
        }
      } else if (relayState == "off") {
        digitalWrite(RELAY_PIN, HIGH);  // HIGH turns OFF for relay
        if (DEBUG_RELAY) {
          Serial.println("\nRelay turned OFF:");
          Serial.print("- Virtual state: OFF");
          Serial.print("- Physical pin (GPIO"); 
          Serial.print(RELAY_PIN); 
          Serial.print(") set to: HIGH");
        }
      }
      
      // Update current state
      currentRelayState = (relayState == "on");
      
    } else {
      if (DEBUG_RELAY) {
        Serial.println("\nFailed to parse relay status:");
        if (error) {
          Serial.print("- JSON parse error: "); 
          Serial.println(error.c_str());
        } else {
          Serial.println("- Invalid response format or success=false");
        }
        Serial.print("- Response body: "); 
        Serial.println(responseBody);
      }
    }
  } else {
    if (DEBUG_RELAY) {
      Serial.println("\nFailed to get relay status:");
      Serial.print("- Response code: "); 
      Serial.println(response);
      String responseBody = http.getString();
      Serial.print("- Response body: "); 
      Serial.println(responseBody);
    }
  }
  http.end();
} 