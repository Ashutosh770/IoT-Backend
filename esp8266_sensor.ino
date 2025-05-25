#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <time.h>

// WiFi credentials
const char* ssid = "Ashutosh's S21 FE";
const char* password = "12341234";

// Backend API configuration
const char* serverUrl = "https://iot-backend-dj8u.onrender.com";
const char* deviceId = "ESP32_001";
const char* authToken = "ec0d7c50f303ef0af51928bd681f246f1d2cd53c5e9db7ac8afc4713380f660b";

// DHT sensor configuration
#define DHTPIN 5         // GPIO4 (D4)
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// Timing
const unsigned long SEND_INTERVAL = 30000;  // 30 second
unsigned long lastSendTime = 0;

// NTP config
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 0;
const int daylightOffset_sec = 3600;

void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println("Starting DHT11 sensor test...");
  dht.begin();
  delay(2000);  // Let DHT stabilize

  float testTemp = dht.readTemperature();
  float testHumidity = dht.readHumidity();

  Serial.println("Initial sensor test:");
  Serial.print("Temperature: "); Serial.println(testTemp);
  Serial.print("Humidity: "); Serial.println(testHumidity);

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConnected to WiFi");
  Serial.print("IP Address: "); Serial.println(WiFi.localIP());

  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  Serial.println("Waiting for NTP time sync...");
  while (!time(nullptr)) {
    delay(1000);
    Serial.print(".");
  }

  Serial.println("\nTime synchronized.");
  struct tm timeinfo;
  getLocalTime(&timeinfo);
  char timeString[50];
  strftime(timeString, sizeof(timeString), "%A, %B %d %Y %H:%M:%S", &timeinfo);
  Serial.println(timeString);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    WiFi.begin(ssid, password);
    delay(5000);
    return;
  }

  if (millis() - lastSendTime >= SEND_INTERVAL) {
    Serial.println("\nReading sensor data...");

    float temperature = NAN, humidity = NAN;

    // Retry up to 3 times
    for (int i = 0; i < 3; i++) {
      temperature = dht.readTemperature();
      humidity = dht.readHumidity();
      if (!isnan(temperature) && !isnan(humidity)) break;
      Serial.println("Sensor failed! Retrying...");
      delay(2000);
    }

    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("Still failed. Skipping this cycle.");
      return;
    }

    Serial.print("Temperature: "); Serial.print(temperature); Serial.println(" °C");
    Serial.print("Humidity: "); Serial.print(humidity); Serial.println(" %");

    // Prepare JSON
    StaticJsonDocument<200> doc;
    doc["deviceId"] = deviceId;
    doc["temperature"] = temperature;
    doc["humidity"] = humidity;
    String jsonString;
    serializeJson(doc, jsonString);

    if (sendData(jsonString)) {
      Serial.println("Data sent successfully");
      lastSendTime = millis();
    } else {
      Serial.println("Failed to send data");
    }
  }
}

bool sendData(String jsonData) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    WiFiClientSecure client;
    client.setInsecure();  // Use only for testing self-signed HTTPS

    String endpoint = String(serverUrl) + "/api/data";
    http.begin(client, endpoint);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-auth-token", authToken);

    int httpResponseCode = http.POST(jsonData);

    if (httpResponseCode > 0) {
      Serial.println("HTTP Response code: " + String(httpResponseCode));
      Serial.println("Response: " + http.getString());
      http.end();
      return true;
    } else {
      Serial.println("POST failed, code: " + String(httpResponseCode));
      http.end();
      return false;
    }
  }

  Serial.println("WiFi not connected during sendData()");
  return false;
}
