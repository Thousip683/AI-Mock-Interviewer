import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Holds a reference to Clerk's getToken function — set by AuthProvider
let _getToken = null;

export const setGetToken = (fn) => {
  _getToken = fn;
};

// Intercept every request and attach a fresh Clerk token
api.interceptors.request.use(async (config) => {
  if (_getToken) {
    const token = await _getToken();
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return config;
});

// Keep setAuthToken for backward compatibility (no-op now)
export const setAuthToken = () => {};

export default api;