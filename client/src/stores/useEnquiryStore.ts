// import { create } from 'zustand';
import { SalesEnquiry, CreateEnquiryForm, EnquiryState } from '../types';
import { enquiryService } from '../services/enquiryService';

// Temporary store implementation without Zustand
const mockEnquiryStore: EnquiryState = {
  enquiries: [],
  currentEnquiry: null,
  loading: false,
  error: null,

  fetchEnquiries: async () => {
    try {
      mockEnquiryStore.loading = true;
      mockEnquiryStore.error = null;
      const response = await enquiryService.getAll();
      mockEnquiryStore.enquiries = response.data;
      mockEnquiryStore.loading = false;
    } catch (error) {
      mockEnquiryStore.error = 'Failed to fetch enquiries';
      mockEnquiryStore.loading = false;
    }
  },

  fetchEnquiryById: async (id: number) => {
    try {
      mockEnquiryStore.loading = true;
      mockEnquiryStore.error = null;
      const response = await enquiryService.getById(id);
      mockEnquiryStore.currentEnquiry = response.data;
      mockEnquiryStore.loading = false;
    } catch (error) {
      mockEnquiryStore.error = 'Failed to fetch enquiry';
      mockEnquiryStore.loading = false;
    }
  },

  createEnquiry: async (data: CreateEnquiryForm) => {
    try {
      mockEnquiryStore.loading = true;
      mockEnquiryStore.error = null;
      const response = await enquiryService.create(data);
      mockEnquiryStore.enquiries = [response.data, ...mockEnquiryStore.enquiries];
      mockEnquiryStore.loading = false;
      mockEnquiryStore.currentEnquiry = response.data;
    } catch (error) {
      mockEnquiryStore.error = 'Failed to create enquiry';
      mockEnquiryStore.loading = false;
    }
  },

  updateEnquiry: async (id: number, data: Partial<SalesEnquiry>) => {
    try {
      mockEnquiryStore.loading = true;
      mockEnquiryStore.error = null;
      const response = await enquiryService.update(id, data);
      const updatedEnquiries = mockEnquiryStore.enquiries.map((enquiry: any) =>
        enquiry.id === id ? { ...enquiry, ...response.data } : enquiry
      );
      mockEnquiryStore.enquiries = updatedEnquiries;
      mockEnquiryStore.loading = false;
      mockEnquiryStore.currentEnquiry = response.data;
    } catch (error) {
      mockEnquiryStore.error = 'Failed to update enquiry';
      mockEnquiryStore.loading = false;
    }
  },

  deleteEnquiry: async (id: number) => {
    try {
      mockEnquiryStore.loading = true;
      mockEnquiryStore.error = null;
      await enquiryService.delete(id);
      const filteredEnquiries = mockEnquiryStore.enquiries.filter(enquiry => enquiry.id !== id);
      mockEnquiryStore.enquiries = filteredEnquiries;
      mockEnquiryStore.loading = false;
    } catch (error) {
      mockEnquiryStore.error = 'Failed to delete enquiry';
      mockEnquiryStore.loading = false;
    }
  },
};

export const useEnquiryStore = () => mockEnquiryStore;