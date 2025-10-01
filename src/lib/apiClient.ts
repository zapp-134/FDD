import axios, { AxiosRequestConfig } from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

export function createFetcher<T>(path: string, opts?: AxiosRequestConfig) {
  return async (params?: Record<string, any>): Promise<T> => {
    const config: AxiosRequestConfig = { params, ...(opts || {}) };
    const res = await api.get<T>(path, config);
    return res.data;
  };
}

// default export for compatibility with hooks that import default
export default api;
