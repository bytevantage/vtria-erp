import axios from 'axios';
import { SalesEnquiry, CreateEnquiryForm, ApiResponse, PaginatedResponse } from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const enquiryService = {
  getAll: async (params?: { page?: number; limit?: number; status?: string }): Promise<PaginatedResponse<SalesEnquiry>> => {
    const response = await api.get('/sales-enquiries', { params });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<SalesEnquiry>> => {
    const response = await api.get(`/sales-enquiries/${id}`);
    return response.data;
  },

  create: async (data: CreateEnquiryForm): Promise<ApiResponse<SalesEnquiry>> => {
    const response = await api.post('/sales-enquiries', data);
    return response.data;
  },

  update: async (id: number, data: Partial<SalesEnquiry>): Promise<ApiResponse<SalesEnquiry>> => {
    const response = await api.patch(`/sales-enquiries/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/sales-enquiries/${id}`);
    return response.data;
  },

  assign: async (id: number, assignedTo: number): Promise<ApiResponse<SalesEnquiry>> => {
    const response = await api.patch(`/sales-enquiries/${id}/assign`, { assigned_to: assignedTo });
    return response.data;
  },

  updateStatus: async (id: number, status: string): Promise<ApiResponse<SalesEnquiry>> => {
    const response = await api.patch(`/sales-enquiries/${id}/status`, { status });
    return response.data;
  },
};