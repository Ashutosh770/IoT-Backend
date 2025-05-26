# Relay Control Implementation

This document contains the complete implementation of the relay control functionality for the IoT application.

## Types

```typescript
// types.ts
export interface RelayControlResponse {
  success: boolean;
  deviceId: string;
  relay: 'on' | 'off';
}
```

## API Service

```typescript
// api.ts
import { RelayControlResponse } from './types';
import { getAuthToken } from './auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL 
  ? `${process.env.EXPO_PUBLIC_API_URL}/api`
  : 'https://iot-backend-dj8u.onrender.com/api';

// First register the device if not already registered
export const registerDevice = async (
  deviceId: string,
  name: string,
  location: string
): Promise<{ success: boolean; device: { deviceId: string; authToken: string } }> => {
  try {
    const response = await fetch(`${API_URL}/devices/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceId,
        name,
        location
      }),
    });

    if (!response.ok) {
      throw new Error(`Registration failed: ${response.status}`);
    }

    const data = await response.json();
    if (data.success && data.device?.authToken) {
      // Store the auth token immediately after registration
      await storeAuthToken(deviceId, data.device.authToken);
    }
    return data;
  } catch (error) {
    console.error('Device registration error:', error);
    throw error;
  }
};

export const controlRelay = async (
  deviceId: string, 
  state: 'on' | 'off'
): Promise<RelayControlResponse> => {
  try {
    const authToken = await getAuthToken(deviceId);
    if (!authToken) {
      throw new Error('No auth token found for device. Please register the device first.');
    }

    console.log('Controlling relay:', { deviceId, state, authToken });

    const response = await fetch(`${API_URL}/relay/control`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': authToken
      },
      body: JSON.stringify({
        deviceId,
        relay: state
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Relay control failed:', { 
        status: response.status, 
        error: errorData,
        headers: response.headers
      });
      
      if (response.status === 401) {
        throw new Error('Authentication failed. Please re-register the device.');
      }
      
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Relay control response:', data);
    return data;
  } catch (error) {
    console.error('Error controlling relay:', error);
    throw error;
  }
};
```

## Authentication Utilities

```typescript
// auth.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = '@auth_token';

export const storeAuthToken = async (deviceId: string, token: string) => {
  try {
    const key = `${AUTH_TOKEN_KEY}_${deviceId}`;
    await AsyncStorage.setItem(key, token);
    console.log('Auth token stored successfully for device:', deviceId);
  } catch (error) {
    console.error('Error storing auth token:', error);
    throw error; // Propagate error to handle it in the component
  }
};

export const getAuthToken = async (deviceId: string): Promise<string | null> => {
  try {
    const key = `${AUTH_TOKEN_KEY}_${deviceId}`;
    const token = await AsyncStorage.getItem(key);
    if (!token) {
      console.log('No auth token found for device:', deviceId);
    }
    return token;
  } catch (error) {
    console.error('Error retrieving auth token:', error);
    return null;
  }
};

export const clearAuthToken = async (deviceId: string) => {
  try {
    const key = `${AUTH_TOKEN_KEY}_${deviceId}`;
    await AsyncStorage.removeItem(key);
    console.log('Auth token cleared for device:', deviceId);
  } catch (error) {
    console.error('Error clearing auth token:', error);
  }
};
```

## React Component

```typescript
// RelayControl.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { controlRelay, registerDevice } from '../services/api';
import { storeAuthToken, getAuthToken, clearAuthToken } from '../utils/auth';
import { RelayControlResponse } from '../types';

interface RelayControlProps {
  deviceId: string;
  deviceName: string;
  deviceLocation: string;
  initialState?: 'on' | 'off';
}

export const RelayControl: React.FC<RelayControlProps> = ({ 
  deviceId,
  deviceName,
  deviceLocation,
  initialState = 'off' 
}) => {
  const [relayState, setRelayState] = useState<'on' | 'off'>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    checkRegistration();
  }, [deviceId]);

  const checkRegistration = async () => {
    try {
      const token = await getAuthToken(deviceId);
      setIsRegistered(!!token);
    } catch (error) {
      console.error('Error checking registration:', error);
      setIsRegistered(false);
    }
  };

  const registerDeviceAndStoreToken = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await registerDevice(deviceId, deviceName, deviceLocation);
      if (response.success && response.device?.authToken) {
        await storeAuthToken(deviceId, response.device.authToken);
        setIsRegistered(true);
      } else {
        throw new Error('Device registration failed');
      }
    } catch (err) {
      console.error('Error registering device:', err);
      setError(err instanceof Error ? err.message : 'Failed to register device');
    } finally {
      setLoading(false);
    }
  };

  const toggleRelay = async () => {
    try {
      setLoading(true);
      setError(null);
      const newState = relayState === 'on' ? 'off' : 'on';
      
      console.log('Toggling relay:', { deviceId, newState });
      
      const response = await controlRelay(deviceId, newState);
      if (response.success) {
        setRelayState(newState);
      } else {
        throw new Error('Failed to control relay');
      }
    } catch (err) {
      console.error('Error toggling relay:', err);
      setError(err instanceof Error ? err.message : 'Failed to control relay');
      
      // If authentication failed, clear the token and mark as unregistered
      if (err.message.includes('Authentication failed')) {
        await clearAuthToken(deviceId);
        setIsRegistered(false);
      }
      
      // Revert state on error
      setRelayState(relayState);
    } finally {
      setLoading(false);
    }
  };

  if (!isRegistered) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Device Not Registered</Text>
        <TouchableOpacity
          style={[styles.button, styles.buttonRegister, loading && styles.buttonDisabled]}
          onPress={registerDeviceAndStoreToken}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Register Device</Text>
          )}
        </TouchableOpacity>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Relay Control</Text>
      <TouchableOpacity
        style={[
          styles.button,
          relayState === 'on' ? styles.buttonOn : styles.buttonOff,
          loading && styles.buttonDisabled
        ]}
        onPress={toggleRelay}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {relayState === 'on' ? 'Turn Off' : 'Turn On'}
          </Text>
        )}
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonOn: {
    backgroundColor: '#4CAF50',
  },
  buttonOff: {
    backgroundColor: '#f44336',
  },
  buttonRegister: {
    backgroundColor: '#2196F3',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    marginTop: 8,
  },
});
```

## Usage Example

```typescript
// Example usage in a screen or component
import { RelayControl } from './components/RelayControl';

const DeviceScreen = () => {
  return (
    <View>
      <RelayControl
        deviceId="ESP32_001"
        deviceName="Living Room Sensor"
        deviceLocation="Living Room"
        initialState="off"
      />
    </View>
  );
};
```

## Features

1. **Type Safety**: Full TypeScript implementation with proper interfaces
2. **Error Handling**: Comprehensive error handling and user feedback
3. **Loading States**: Visual feedback during API calls
4. **State Management**: Local state management with React hooks
5. **Authentication**: Secure token storage using AsyncStorage
6. **Styling**: Clean and responsive UI with proper visual feedback
7. **Logging**: Detailed console logging for debugging

## Dependencies

Make sure to install these dependencies:

```bash
npm install @react-native-async-storage/async-storage
# or
yarn add @react-native-async-storage/async-storage
```

## Environment Variables

Add this to your `.env` file:

```
EXPO_PUBLIC_API_URL=https://iot-backend-dj8u.onrender.com
```

## Notes

1. The component assumes the backend API is running and accessible
2. Authentication tokens are stored securely using AsyncStorage
3. The UI provides visual feedback for all states (loading, error, success)
4. The implementation includes proper error handling and state management
5. The code is fully typed with TypeScript for better development experience 