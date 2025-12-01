// client.ts
import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Resolve API base URL dynamically.
 * Priority:
 * 1) global.__API_BASE_URL__
 * 2) Expo config extra
 * 3) process.env.API_BASE_URL
 * 4) Android emulator shortcut 10.0.2.2
 * 5) LAN IP from Expo debuggerHost
 * 6) Fallback localhost
 */
function resolveBaseUrl(): string {
  const globalOverride = (global as any)?.__API_BASE_URL__;
  const expoExtra = (Constants as any)?.manifest?.extra?.API_BASE_URL
    || (Constants as any)?.expoConfig?.extra?.API_BASE_URL;
  const envUrl = process.env?.API_BASE_URL;

  let base = globalOverride || expoExtra || envUrl;

  if (!base) {
    if (Platform.OS === 'android') {
      base = 'http://10.0.2.2:3000/api';
    } else {
      const debuggerHost = (Constants as any)?.manifest?.debuggerHost
        || (Constants as any)?.manifest2?.debuggerHost
        || (Constants as any)?.debuggerHost;
      if (debuggerHost && typeof debuggerHost === 'string') {
        const host = debuggerHost.split(':')[0];
        base = `http://${host}:3000/api`;
      } else {
        base = 'http://localhost:3000/api';
      }
    }
  }

  base = base.trim(); // ✅ Remove leading/trailing spaces

  if (__DEV__) {
    console.log(
      '[API CLIENT] resolved API_BASE_URL ->',
      base,
      { globalOverride: !!globalOverride, expoExtra: !!expoExtra, envUrl: !!envUrl, platform: Platform.OS }
    );
    if (base.includes('localhost') && Platform.OS !== 'web') {
      console.warn(
        '[API CLIENT] Using localhost on a physical device. This may not work. Consider using LAN IP or global.__API_BASE_URL__.'
      );
    }
  }

  return base;
}

export function getApiBaseUrl(): string {
  return resolveBaseUrl();
}

// ---------------- CREATE AXIOS CLIENT ----------------
const client = axios.create({
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---------------- REQUEST INTERCEPTOR ----------------
client.interceptors.request.use((config) => {
  try {
    const resolvedBase = resolveBaseUrl();
    client.defaults.baseURL = resolvedBase;
    config.baseURL = resolvedBase;
  } catch {
    // ignore
  }

  if (__DEV__) {
    // Log clean URL for debugging
    const fullUrl = `${config.baseURL}${config.url}`.replace(/\s+/g, '');
    console.log('[API REQUEST]', config.method?.toUpperCase(), fullUrl);
  }

  return config;
});

// ---------------- RESPONSE INTERCEPTOR ----------------
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (__DEV__) {
      console.warn(
        '[API ERROR]',
        err?.config?.url ?? '<unknown>',
        err?.message ?? err
      );
    }
    return Promise.reject(err);
  }
);

export default client;
