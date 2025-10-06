/**
 * Production Management System
 * 
 * This is the unified production/manufacturing management system that handles:
 * - Cases Ready for Production (cases with approved quotations waiting for manufacturing)
 * - Manufacturing Cases (active production cases with work orders)
 * - Work Order Management (create, edit, delete work orders)
 * - Production Progress Tracking
 * 
 * Note: This replaces the old separate "Manufacturing" and "Production" systems
 * and uses manufacturing_cases and manufacturing_work_orders tables.
 */
import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  IconButton,
  Tabs,
  Tab,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Factory as FactoryIcon,
  Assignment as AssignmentIcon,
  Dashboard as DashboardIcon,
  Build as BuildIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Timeline as TimelineIcon,
  Description as DescriptionIcon,
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { api } from '../utils/api';

const ProductionManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [dashboardData, setDashboardData] = useState(null);
  const [workOrders, setWorkOrders] = useState([]);
  const [manufacturingUnits, setManufacturingUnits] = useState([]);
  const [operations, setOperations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({});

  // Manufacturing Cases state
  const [casesReadyForProduction, setCasesReadyForProduction] = useState([]);
  const [manufacturingCases, setManufacturingCases] = useState([]);
  const [estimationDetails, setEstimationDetails] = useState(null);

  const [bomComponents, setBomComponents] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [editWorkOrderDialogOpen, setEditWorkOrderDialogOpen] = useState(false);

  // Fetch data from APIs
  useEffect(() => {
    fetchDashboardData();
    fetchCasesReadyForProduction();
    fetchManufacturingCases();
    fetchManufacturingUnits();
    fetchOperations();
    fetchCategories();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [dashResponse, casesResponse] = await Promise.all([
        api.get('/api/production/dashboard'),
        api.get('/api/production/cases')
      ]);

      if (dashResponse.success && casesResponse.success) {
        // Calculate manufacturing case statistics
        const cases = casesResponse.data;
        const caseStats = cases.reduce((acc, case_) => {
          acc[case_.status] = (acc[case_.status] || 0) + 1;
          return acc;
        }, {});

        const enhancedData = {
          ...dashData.data,
          manufacturing_cases_count: cases.length,
          manufacturing_case_stats: Object.entries(caseStats).map(([status, count]) => ({
            status,
            count
          })),
          recent_manufacturing_cases: cases.slice(0, 5)
        };

        setDashboardData(enhancedData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  // Removed unused fetch functions: fetchProductionItems

  const fetchManufacturingUnits = async () => {
    try {
      const response = await api.get('/api/production/master/manufacturing-units');
      if (response.success) {
        setManufacturingUnits(response.data);
      }
    } catch (error) {
      console.error('Error fetching manufacturing units:', error);
    }
  };

  const fetchOperations = async () => {
    try {
      const response = await api.get('/api/production/master/operations');
      if (response.success) {
        setOperations(response.data);
      }
    } catch (error) {
      console.error('Error fetching operations:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/production/master/categories');
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };  // Manufacturing Cases fetch functions
  const fetchCasesReadyForProduction = async () => {
    try {
      const response = await api.get('/api/production/cases/ready');
      if (response && response.success) {
        setCasesReadyForProduction(response.data);
        // Don't set error for empty data - let the UI handle empty state gracefully
      } else {
        // Only set error for actual API failures, not empty data
        console.warn('API response not successful:', response);
        setCasesReadyForProduction([]); // Set empty array instead of error
      }
    } catch (error) {
      console.error('Error fetching cases ready for production:', error);
      setError('Error connecting to server. Please check if the API is running.');
    }
  };

  const fetchManufacturingCases = async () => {
    try {
      const response = await api.get('/api/production/cases');

      console.log('Manufacturing Cases Response:', response);

      if (response.success) {
        console.log('Manufacturing Cases Fetched:', response.data);
        setManufacturingCases(response.data);
      } else {
        console.warn('API response not successful:', response);
        setManufacturingCases([]);
      }
    } catch (error) {
      console.error('Error fetching manufacturing cases:', error);
      setError('Error connecting to server. Please check if the API is running.');
    }
  };

  const fetchEstimationDetails = async (caseId) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/production/cases/${caseId}/estimation-details`);
      if (response && response.success) {
        setEstimationDetails(response.data);
      } else {
        setError(response?.message || 'Failed to fetch estimation details');
      }
    } catch (error) {
      console.error('Error fetching estimation details:', error);
      setError('Failed to fetch estimation details');
    } finally {
      setLoading(false);
    }
  };

  const moveToProduction = async (caseId, productionData) => {
    try {
      setLoading(true);
      const response = await api.post(`/api/production/cases/${caseId}/move-to-production`, productionData);
      if (response && response.success) {
        alert('Case moved to production successfully!');
        fetchCasesReadyForProduction();
        fetchManufacturingCases();
        setDialogOpen(false);
        setFormData({});
      } else {
        setError(response?.message || 'Failed to move case to production');
      }
    } catch (error) {
      console.error('Error moving case to production:', error);
      setError('Failed to move case to production');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const openDialog = (type, item = null) => {
    setDialogType(type);
    setSelectedItem(item);
    setFormData(item || {});
    setDialogOpen(true);

    // Load estimation details if viewing estimation
    if (type === 'viewEstimation' && item) {
      fetchEstimationDetails(item.id);
    }

    // Load work orders if viewing work orders
    if (type === 'viewWorkOrders' && item) {
      fetchWorkOrdersForCase(item.id);
    }

    // Load BOM components if viewing BOM
    if (type === 'viewBOM' && item) {
      fetchBOMComponents(item.id);
    }
  };

  // Fetch work orders for a manufacturing case
  const fetchWorkOrdersForCase = async (manufacturingCaseId) => {
    try {
      const response = await api.get(`/api/production/manufacturing-cases/${manufacturingCaseId}/work-orders`);
      if (response.success) {
        setWorkOrders(response.data);
      }
    } catch (error) {
      console.error('Error fetching work orders:', error);
      setWorkOrders([]);
    }
  };



  const fetchBOMComponents = async (bomId) => {
    try {
      const response = await api.get(`/api/production/boms/${bomId}/components`);
      if (response.success) {
        setBomComponents(response.data);
      }
    } catch (error) {
      console.error('Error fetching BOM components:', error);
      setBomComponents([]);
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedItem(null);
    setFormData({});
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      if (dialogType === 'moveToProduction') {
        await moveToProduction(selectedItem.id, formData);
        return;
      }

      if (dialogType === 'updateProgress') {
        const response = await api.put(`/api/production/manufacturing-cases/${selectedItem.id}/progress`, {
          progress_percentage: formData.progress_percentage,
          notes: formData.notes
        });

        if (response.success) {
          fetchManufacturingCases();
          closeDialog();
          alert('Progress updated successfully!');
        }
        return;
      }

      if (dialogType === 'editManufacturingCase') {
        const response = await api.put(`/api/production/manufacturing-cases/${selectedItem.id}/status`, {
          status: formData.status,
          planned_start_date: formData.planned_start_date,
          planned_end_date: formData.planned_end_date,
          notes: formData.notes
        });

        if (response.success) {
          fetchManufacturingCases();
          closeDialog();
          alert('Manufacturing case updated successfully!');
        }
        return;
      }

      let url = '';
      let method = 'POST';

      if (dialogType === 'productionItem') {
        url = `${process.env.REACT_APP_API_URL}/api/production/items`;
      } else if (dialogType === 'workOrder') {
        url = `${process.env.REACT_APP_API_URL}/api/production/work-orders`;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        closeDialog();
        // Refresh data
        fetchDashboardData();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error submitting form');
    }
  };

  // Enterprise-level handler functions for manufacturing cases
  const handleStartProduction = async (mfgCase) => {
    try {
      const response = await api.put(`/production/manufacturing-cases/${mfgCase.id}/status`, {
        status: 'in_progress',
        actual_start_date: new Date().toISOString().split('T')[0]
      });

      if (response.success) {
        fetchManufacturingCases();
        alert('Production started successfully!');
      }
    } catch (error) {
      console.error('Error starting production:', error);
      alert('Failed to start production');
    }
  };

  const handlePauseProduction = async (mfgCase) => {
    const reason = prompt('Please provide a reason for pausing production:');
    if (reason === null) return;

    try {
      const response = await api.put(`/production/manufacturing-cases/${mfgCase.id}/status`, {
        status: 'on_hold',
        notes: `${mfgCase.notes || ''}\n[PAUSED] ${new Date().toLocaleString()}: ${reason}`
      });

      if (response.success) {
        fetchManufacturingCases();
        alert('Production paused successfully!');
      }
    } catch (error) {
      console.error('Error pausing production:', error);
      alert('Failed to pause production');
    }
  };

  const handleResumeProduction = async (mfgCase) => {
    try {
      const response = await api.put(`/production/manufacturing-cases/${mfgCase.id}/status`, {
        status: 'in_progress',
        notes: `${mfgCase.notes || ''}\n[RESUMED] ${new Date().toLocaleString()}`
      });

      if (response.success) {
        fetchManufacturingCases();
        alert('Production resumed successfully!');
      }
    } catch (error) {
      console.error('Error resuming production:', error);
      alert('Failed to resume production');
    }
  };

  const handleCreateWorkOrders = async (mfgCase) => {
    try {
      const response = await api.post(`/api/production/manufacturing-cases/${mfgCase.id}/work-orders`, {
        title: `Production Work Order for ${mfgCase.client_name || 'Manufacturing Case'}`,
        description: `Manufacturing work order for case ${mfgCase.manufacturing_case_number}`,
        priority: 'medium'
      });

      if (response?.success) {
        const workOrders = response.data.work_orders;
        const workOrderNumbers = workOrders.map(wo => wo.work_order_number).join(', ');
        alert(`✅ Work orders created successfully!\nWork Orders: ${workOrderNumbers}`);

        // Refresh all relevant data
        fetchManufacturingCases();
        fetchDashboardData();
      } else {
        alert(`❌ Failed to create work order: ${response?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating work orders:', error);
      alert('❌ Failed to create work order. Please try again.');
    }
  };

  const handleViewWorkOrders = (mfgCase) => {
    openDialog('viewWorkOrders', mfgCase);
  };

  const handleEditWorkOrder = (workOrder) => {
    setSelectedWorkOrder(workOrder);
    setEditWorkOrderDialogOpen(true);
  };

  const handleDeleteWorkOrder = async (workOrderId, workOrderNumber) => {
    if (window.confirm(`Are you sure you want to delete work order ${workOrderNumber}?`)) {
      try {
        const response = await api.delete(`/api/production/work-orders/${workOrderId}`);
        if (response?.success) {
          alert('✅ Work order deleted successfully!');
          // Refresh work orders
          if (selectedItem) {
            await fetchWorkOrdersForCase(selectedItem.id);
          }
          fetchManufacturingCases(); // Refresh main list
        } else {
          alert(`❌ Failed to delete work order: ${response?.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error deleting work order:', error);
        alert('❌ Failed to delete work order. Please try again.');
      }
    }
  };

  const handleSaveWorkOrder = async () => {
    if (!selectedWorkOrder) return;

    try {
      setLoading(true);
      const response = await api.put(`/api/production/work-orders/${selectedWorkOrder.id}`, {
        operation_name: selectedWorkOrder.operation_name,
        status: selectedWorkOrder.status,
        estimated_hours: parseFloat(selectedWorkOrder.estimated_hours) || 0,
        actual_hours: parseFloat(selectedWorkOrder.actual_hours) || 0,
        planned_start_date: selectedWorkOrder.planned_start_date,
        actual_start_date: selectedWorkOrder.actual_start_date
      });

      if (response?.success) {
        alert('✅ Work order updated successfully!');
        setEditWorkOrderDialogOpen(false);
        setSelectedWorkOrder(null);

        // Refresh work orders
        if (selectedItem) {
          await fetchWorkOrdersForCase(selectedItem.id);
        }
        fetchManufacturingCases(); // Refresh main list
      } else {
        alert(`❌ Failed to update work order: ${response?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating work order:', error);
      alert('❌ Failed to update work order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProgress = (mfgCase) => {
    openDialog('updateProgress', mfgCase);
  };

  const handleGenerateReport = async (mfgCase) => {
    try {
      const response = await api.get(`/api/production/manufacturing-cases/${mfgCase.id}/report`);
      const reportData = response.data;

      // Create formatted HTML report
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Manufacturing Case Report - ${mfgCase.manufacturing_case_number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .section-title { background-color: #f0f0f0; padding: 8px; font-weight: bold; border-left: 4px solid #007bff; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0; }
            .info-item { padding: 5px; border-bottom: 1px solid #eee; }
            .info-label { font-weight: bold; color: #666; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { padding: 8px; border: 1px solid #ddd; text-align: left; }
            th { background-color: #f8f9fa; }
            .summary { background-color: #e7f3ff; padding: 15px; border-radius: 5px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Manufacturing Case Report</h1>
            <h2>${reportData.manufacturing_case.manufacturing_case_number}</h2>
            <p>Generated on: ${new Date(reportData.generated_at).toLocaleString()}</p>
          </div>

          <div class="section">
            <div class="section-title">Case Information</div>
            <div class="info-grid">
              <div class="info-item"><span class="info-label">Case Number:</span> ${reportData.manufacturing_case.case_number}</div>
              <div class="info-item"><span class="info-label">Project:</span> ${reportData.manufacturing_case.project_name}</div>
              <div class="info-item"><span class="info-label">Client:</span> ${reportData.manufacturing_case.client_name}</div>
              <div class="info-item"><span class="info-label">Status:</span> ${reportData.manufacturing_case.status}</div>
              <div class="info-item"><span class="info-label">Priority:</span> ${reportData.manufacturing_case.priority}</div>
              <div class="info-item"><span class="info-label">Progress:</span> ${reportData.manufacturing_case.progress_percentage}%</div>
              <div class="info-item"><span class="info-label">Created By:</span> ${reportData.manufacturing_case.created_by_name}</div>
              <div class="info-item"><span class="info-label">Created:</span> ${new Date(reportData.manufacturing_case.created_at).toLocaleDateString()}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Work Orders (${reportData.summary.total_work_orders})</div>
            ${reportData.work_orders.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>Work Order #</th>
                    <th>Operation</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>Est. Hours</th>
                    <th>Actual Hours</th>
                    <th>Planned Start</th>
                  </tr>
                </thead>
                <tbody>
                  ${reportData.work_orders.map(wo => `
                    <tr>
                      <td>${wo.work_order_number}</td>
                      <td>${wo.operation_name}</td>
                      <td>${wo.status}</td>
                      <td>${wo.assigned_to_name || 'Unassigned'}</td>
                      <td>${wo.estimated_hours}</td>
                      <td>${wo.actual_hours}</td>
                      <td>${wo.planned_start_date ? new Date(wo.planned_start_date).toLocaleDateString() : 'TBD'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<p>No work orders found.</p>'}
          </div>

          <div class="section">
            <div class="section-title">Summary</div>
            <div class="summary">
              <div class="info-grid">
                <div class="info-item"><span class="info-label">Total Work Orders:</span> ${reportData.summary.total_work_orders}</div>
                <div class="info-item"><span class="info-label">Completed:</span> ${reportData.summary.completed_work_orders}</div>
                <div class="info-item"><span class="info-label">In Progress:</span> ${reportData.summary.in_progress_work_orders}</div>
                <div class="info-item"><span class="info-label">Pending:</span> ${reportData.summary.pending_work_orders}</div>
                <div class="info-item"><span class="info-label">Total Est. Hours:</span> ${reportData.summary.total_estimated_hours}</div>
                <div class="info-item"><span class="info-label">Total Actual Hours:</span> ${reportData.summary.total_actual_hours}</div>
              </div>
            </div>
          </div>

          ${reportData.manufacturing_case.notes ? `
            <div class="section">
              <div class="section-title">Notes</div>
              <p>${reportData.manufacturing_case.notes}</p>
            </div>
          ` : ''}
        </body>
        </html>
      `;

      // Open formatted report in new window
      const reportWindow = window.open('', '_blank');
      reportWindow.document.write(htmlContent);
      reportWindow.document.close();

      // Automatically trigger print dialog
      setTimeout(() => {
        reportWindow.print();
      }, 100);

    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    }
  };

  const handleDownloadBOM = async (mfgCase) => {
    try {
      // Create a simple BOM with available manufacturing case data
      const bomHtmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Bill of Materials - ${mfgCase.manufacturing_case_number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .info-section { margin-bottom: 20px; background-color: #f8f9fa; padding: 15px; border-radius: 5px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .info-item { padding: 5px; }
            .info-label { font-weight: bold; color: #666; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
            th { background-color: #f8f9fa; font-weight: bold; }
            .section-header { background-color: #e3f2fd; font-weight: bold; }
            .subsection-header { background-color: #f3e5f5; font-style: italic; }
            .total-row { background-color: #fff3e0; font-weight: bold; }
            @media print { body { margin: 0; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Bill of Materials (BOM)</h1>
            <h2>${mfgCase.manufacturing_case_number}</h2>
            <p>Generated on: ${new Date().toLocaleString()}</p>
          </div>

          <div class="info-section">
            <h3>Project Information</h3>
            <div class="info-grid">
              <div class="info-item"><span class="info-label">Project:</span> ${mfgCase.project_name}</div>
              <div class="info-item"><span class="info-label">Client:</span> ${mfgCase.client_name}</div>
              <div class="info-item"><span class="info-label">Case Number:</span> ${mfgCase.case_number}</div>
              <div class="info-item"><span class="info-label">Estimation:</span> ${mfgCase.estimation_id}</div>
              <div class="info-item"><span class="info-label">Manufacturing Case:</span> ${mfgCase.manufacturing_case_number}</div>
              <div class="info-item"><span class="info-label">Status:</span> ${mfgCase.status.toUpperCase()}</div>
            </div>
          </div>

          <div class="info-section">
            <h3>Bill of Materials Summary</h3>
            <p><strong>Note:</strong> This BOM template is generated from the manufacturing case. 
               For detailed item-wise breakdown, please refer to the original estimation: <strong>${mfgCase.estimation_id}</strong></p>
            
            <table style="width: 100%; border: 1px solid #ddd; margin: 15px 0;">
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; background-color: #f8f9fa; font-weight: bold;">Manufacturing Case</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${mfgCase.manufacturing_case_number}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; background-color: #f8f9fa; font-weight: bold;">Linked Estimation</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${mfgCase.estimation_id}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; background-color: #f8f9fa; font-weight: bold;">Work Orders Count</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${mfgCase.work_orders_count || 0}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; background-color: #f8f9fa; font-weight: bold;">Progress</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${parseFloat(mfgCase.progress_percentage || 0)}%</td>
              </tr>
            </table>
          </div>

          <div class="no-print" style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; background-color: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer;">
              Print BOM
            </button>
          </div>
        </body>
        </html>
      `;

      // Try to open in new window, fallback to download
      const bomWindow = window.open('', '_blank');

      if (bomWindow && bomWindow.document) {
        // Popup allowed - open in new window
        bomWindow.document.write(bomHtmlContent);
        bomWindow.document.close();

        // Automatically trigger print dialog
        setTimeout(() => {
          bomWindow.print();
        }, 100);
      } else {
        // Popup blocked - download as file
        const blob = new Blob([bomHtmlContent], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BOM_${mfgCase.manufacturing_case_number.replace(/\//g, '_')}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        alert('BOM downloaded as HTML file. You can open it in your browser and print it.');
      }

    } catch (error) {
      console.error('Error downloading BOM:', error);

      // Fallback: Create a simple text BOM
      try {
        const simpleBomContent = `
BILL OF MATERIALS (BOM)
=======================
Manufacturing Case: ${mfgCase.manufacturing_case_number}
Project: ${mfgCase.project_name}
Client: ${mfgCase.client_name}
Case Number: ${mfgCase.case_number}
Estimation Reference: ${mfgCase.estimation_id}
Status: ${mfgCase.status.toUpperCase()}
Generated: ${new Date().toLocaleString()}

MANUFACTURING DETAILS:
- Work Orders: ${mfgCase.work_orders_count || 0}
- Progress: ${parseFloat(mfgCase.progress_percentage || 0)}%
- Priority: ${mfgCase.priority}
- Created By: ${mfgCase.created_by_name}
- Created On: ${new Date(mfgCase.created_at).toLocaleDateString()}

NOTE: For detailed item breakdown, please refer to the original estimation ${mfgCase.estimation_id}

---
Generated by VTria ERP Manufacturing Management System
        `;

        const blob = new Blob([simpleBomContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BOM_${mfgCase.manufacturing_case_number.replace(/\//g, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        alert('Simple BOM downloaded as text file due to technical issue with detailed BOM generation.');
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        alert('Failed to download BOM. Please contact system administrator.');
      }
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'success',
      pending: 'warning',
      in_progress: 'info',
      completed: 'success',
      paused: 'error',
      cancelled: 'default',
      draft: 'default',
      planned: 'info',
      on_hold: 'warning'
    };
    return colors[status] || 'default';
  };

  // Dashboard Tab
  const DashboardTab = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <DashboardIcon sx={{ mr: 2 }} />
        Production Dashboard
      </Typography>

      {dashboardData && (
        <Grid container spacing={3}>
          {/* Summary Cards */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Manufacturing Cases
                </Typography>
                <Typography variant="h4">
                  {dashboardData.manufacturing_cases_count || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Production Items
                </Typography>
                <Typography variant="h4">
                  {dashboardData.production_items_count}
                </Typography>
              </CardContent>
            </Card>
          </Grid>



          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Manufacturing Units
                </Typography>
                <Typography variant="h4">
                  {manufacturingUnits.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Operations
                </Typography>
                <Typography variant="h4">
                  {operations.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Manufacturing Case Status Chart */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {dashboardData.work_order_stats?.length > 0 ? 'Work Order Status' : 'Manufacturing Case Status'}
                </Typography>
                {(() => {
                  const statsToShow = dashboardData.work_order_stats?.length > 0 ? dashboardData.work_order_stats : dashboardData.manufacturing_case_stats || [];
                  const totalCount = statsToShow.reduce((sum, s) => sum + s.count, 0);

                  return statsToShow.map(stat => (
                    <Box key={stat.status} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">
                          {stat.status.replace('_', ' ').toUpperCase()}
                        </Typography>
                        <Typography variant="body2">
                          {stat.count}
                        </Typography>
                      </Box>
                      <Box sx={{ width: '100%', bgcolor: 'grey.300', borderRadius: 1, height: 8 }}>
                        <Box
                          sx={{
                            width: `${totalCount > 0 ? (stat.count / totalCount) * 100 : 0}%`,
                            bgcolor: getStatusColor(stat.status) + '.main',
                            height: '100%',
                            borderRadius: 1
                          }}
                        />
                      </Box>
                    </Box>
                  ));
                })()}
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Work Orders */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Work Orders
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Work Order ID</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Priority</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(dashboardData.recent_work_orders || []).map(wo => (
                        <TableRow key={wo.id}>
                          <TableCell>{wo.work_order_id}</TableCell>
                          <TableCell>
                            <Chip
                              label={wo.status}
                              color={getStatusColor(wo.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={wo.priority}
                              color={wo.priority === 'high' ? 'error' : wo.priority === 'medium' ? 'warning' : 'default'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );

  // Manufacturing Cases Tab
  const ManufacturingCasesTab = () => (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <BuildIcon sx={{ mr: 2 }} />
        Manufacturing Cases
      </Typography>

      {/* Cases Ready for Production */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <PlayArrowIcon sx={{ mr: 1 }} />
          Cases Ready for Production ({casesReadyForProduction.length})
        </Typography>

        <Card>
          <CardContent>
            {casesReadyForProduction.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: '12px' }}>
                <strong>No cases ready for production.</strong>
                <br />
                Cases will appear here when:
                <br />
                • Quotations are approved by clients
                <br />
                • Sales orders are confirmed
                <br />
                • Ready to begin manufacturing workflow
              </Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Case Number</TableCell>
                      <TableCell>Project Name</TableCell>
                      <TableCell>Client</TableCell>
                      <TableCell>Quotation Amount</TableCell>
                      <TableCell>Assigned To</TableCell>
                      <TableCell>Expected Completion</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {casesReadyForProduction.map(caseItem => (
                      <TableRow key={caseItem.id}>
                        <TableCell>{caseItem.case_number}</TableCell>
                        <TableCell>{caseItem.project_name}</TableCell>
                        <TableCell>{caseItem.client_name}</TableCell>
                        <TableCell>₹{parseFloat(caseItem.quotation_amount || 0).toLocaleString()}</TableCell>
                        <TableCell>{caseItem.assigned_to_name || 'Unassigned'}</TableCell>
                        <TableCell>
                          {caseItem.expected_completion_date
                            ? new Date(caseItem.expected_completion_date).toLocaleDateString()
                            : 'TBD'
                          }
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<ViewIcon />}
                            onClick={() => openDialog('viewEstimation', caseItem)}
                            sx={{ mr: 1 }}
                          >
                            View Details
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<BuildIcon />}
                            onClick={() => openDialog('moveToProduction', caseItem)}
                          >
                            Start Production
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Active Manufacturing Cases */}
      <Box>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <FactoryIcon sx={{ mr: 1 }} />
          Active Manufacturing Cases ({manufacturingCases.length})
        </Typography>

        <Card>
          <CardContent>
            {manufacturingCases.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: '12px' }}>
                <strong>No active manufacturing cases.</strong>
                <br />
                Active cases will show here when:
                <br />
                • Production is started from ready cases
                <br />
                • Work orders are created and assigned
                <br />
                • Manufacturing processes are in progress
              </Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Manufacturing Case #</TableCell>
                      <TableCell>Case Number</TableCell>
                      <TableCell>Project Name</TableCell>
                      <TableCell>Client</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Progress</TableCell>
                      <TableCell>Work Orders</TableCell>
                      <TableCell>Planned Start</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {manufacturingCases.map(mfgCase => (
                      <TableRow key={mfgCase.id}>
                        <TableCell>{mfgCase.manufacturing_case_number}</TableCell>
                        <TableCell>{mfgCase.case_number}</TableCell>
                        <TableCell>{mfgCase.project_name}</TableCell>
                        <TableCell>{mfgCase.client_name}</TableCell>
                        <TableCell>
                          <Chip
                            label={mfgCase.status}
                            color={getStatusColor(mfgCase.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={mfgCase.priority}
                            color={mfgCase.priority === 'high' ? 'error' : mfgCase.priority === 'medium' ? 'warning' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{parseFloat(mfgCase.progress_percentage) || 0}%</TableCell>
                        <TableCell>
                          {mfgCase.completed_work_orders || 0} / {mfgCase.work_orders_count || 0}
                        </TableCell>
                        <TableCell>
                          {mfgCase.planned_start_date
                            ? new Date(mfgCase.planned_start_date).toLocaleDateString()
                            : 'TBD'
                          }
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            <IconButton
                              size="small"
                              onClick={() => openDialog('viewManufacturingCase', mfgCase)}
                              title="View Details"
                            >
                              <ViewIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => openDialog('editManufacturingCase', mfgCase)}
                              title="Edit Case"
                            >
                              <EditIcon />
                            </IconButton>
                            {mfgCase.status === 'draft' && (
                              <IconButton
                                size="small"
                                onClick={() => handleStartProduction(mfgCase)}
                                title="Start Production"
                                sx={{ color: 'success.main' }}
                              >
                                <PlayArrowIcon />
                              </IconButton>
                            )}
                            {mfgCase.status === 'in_progress' && (
                              <IconButton
                                size="small"
                                onClick={() => handlePauseProduction(mfgCase)}
                                title="Pause Production"
                                sx={{ color: 'warning.main' }}
                              >
                                <PauseIcon />
                              </IconButton>
                            )}
                            {mfgCase.status === 'on_hold' && (
                              <IconButton
                                size="small"
                                onClick={() => handleResumeProduction(mfgCase)}
                                title="Resume Production"
                                sx={{ color: 'info.main' }}
                              >
                                <PlayArrowIcon />
                              </IconButton>
                            )}
                            {mfgCase.status === 'approved' && (
                              <IconButton
                                size="small"
                                onClick={() => handleCreateWorkOrders(mfgCase)}
                                title="Create Work Orders"
                                sx={{ color: 'primary.main' }}
                              >
                                <AddIcon />
                              </IconButton>
                            )}
                            <IconButton
                              size="small"
                              onClick={() => handleViewWorkOrders(mfgCase)}
                              title="View Work Orders"
                            >
                              <AssignmentIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleUpdateProgress(mfgCase)}
                              title="Update Progress"
                            >
                              <TimelineIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleGenerateReport(mfgCase)}
                              title="Generate Report"
                            >
                              <DescriptionIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDownloadBOM(mfgCase)}
                              title="Download BOM"
                              sx={{ color: 'secondary.main' }}
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Box>


    </Box>
  );

  // Work Orders Tab
  const WorkOrdersTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center' }}>
          <AssignmentIcon sx={{ mr: 2 }} />
          Work Orders
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => openDialog('workOrder')}
        >
          Create Work Order
        </Button>
      </Box>

      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Work Order ID</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Planned Start</TableCell>
                  <TableCell>Estimated Hours</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {workOrders.map(wo => (
                  <TableRow key={wo.id}>
                    <TableCell>{wo.work_order_id}</TableCell>
                    <TableCell>{wo.title}</TableCell>
                    <TableCell>
                      <Chip
                        label={wo.priority}
                        color={wo.priority === 'high' ? 'error' : wo.priority === 'medium' ? 'warning' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={wo.status}
                        color={getStatusColor(wo.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {wo.planned_start_date ? new Date(wo.planned_start_date).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>{wo.estimated_hours || 'N/A'}</TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => openDialog('workOrder', wo)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small">
                        <ViewIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );

  // Master Data Tab
  const MasterDataTab = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <SettingsIcon sx={{ mr: 2 }} />
        Master Data
      </Typography>

      <Grid container spacing={3}>
        {/* Manufacturing Units */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Manufacturing Units ({manufacturingUnits.length})
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Unit Name</TableCell>
                      <TableCell>Code</TableCell>
                      <TableCell>Capacity</TableCell>
                      <TableCell>Location</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {manufacturingUnits.map(unit => (
                      <TableRow key={unit.id}>
                        <TableCell>{unit.unit_name}</TableCell>
                        <TableCell>{unit.unit_code}</TableCell>
                        <TableCell>{unit.capacity_per_day} {unit.unit_of_measurement}</TableCell>
                        <TableCell>{unit.location}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Production Categories */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Production Categories ({categories.length})
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell>Code</TableCell>
                      <TableCell>Items</TableCell>
                      <TableCell>Lead Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categories.map(category => (
                      <TableRow key={category.id}>
                        <TableCell>{category.category_name}</TableCell>
                        <TableCell>{category.category_code}</TableCell>
                        <TableCell>{category.item_count}</TableCell>
                        <TableCell>{category.default_lead_time_days} days</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Production Operations */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Production Operations ({operations.length})
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Operation</TableCell>
                      <TableCell>Code</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Setup Time</TableCell>
                      <TableCell>Run Time/Unit</TableCell>
                      <TableCell>Hourly Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {operations.map(op => (
                      <TableRow key={op.id}>
                        <TableCell>{op.operation_name}</TableCell>
                        <TableCell>{op.operation_code}</TableCell>
                        <TableCell>
                          <Chip
                            label={op.operation_type}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{op.setup_time_hours}h</TableCell>
                        <TableCell>{op.run_time_per_unit_hours}h</TableCell>
                        <TableCell>₹{op.hourly_rate}/hr</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <FactoryIcon sx={{ mr: 2, fontSize: 40 }} />
        Manufacturing Management
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Dashboard" />
          <Tab label="Manufacturing Cases" />
        </Tabs>
      </Box>

      {activeTab === 0 && <DashboardTab />}
      {activeTab === 1 && <ManufacturingCasesTab />}

      {/* Dialog for Add/Edit */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth={dialogType === 'viewEstimation' ? 'lg' : 'md'} fullWidth>
        <DialogTitle>
          {dialogType === 'viewEstimation' && 'Case Estimation Details'}
          {dialogType === 'moveToProduction' && 'Move Case to Production'}
          {dialogType === 'productionItem' && (selectedItem ? 'Edit' : 'Add') + ' Production Item'}
          {dialogType === 'workOrder' && (selectedItem ? 'Edit' : 'Add') + ' Work Order'}
          {dialogType === 'viewWorkOrders' && 'Work Orders'}
          {dialogType === 'updateProgress' && 'Update Manufacturing Progress'}
          {dialogType === 'viewManufacturingCase' && 'Manufacturing Case Details'}
          {dialogType === 'editManufacturingCase' && 'Edit Manufacturing Case'}
          {dialogType === 'viewBOM' && 'BOM Details'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {dialogType === 'productionItem' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Item Code"
                    value={formData.item_code || ''}
                    onChange={(e) => handleFormChange('item_code', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Item Name"
                    value={formData.item_name || ''}
                    onChange={(e) => handleFormChange('item_name', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    multiline
                    rows={3}
                    value={formData.description || ''}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={formData.category_id || ''}
                      onChange={(e) => handleFormChange('category_id', e.target.value)}
                    >
                      {categories.map(cat => (
                        <MenuItem key={cat.id} value={cat.id}>
                          {cat.category_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Standard Cost"
                    type="number"
                    value={formData.standard_cost || ''}
                    onChange={(e) => handleFormChange('standard_cost', e.target.value)}
                  />
                </Grid>
              </>
            )}

            {dialogType === 'workOrder' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Title"
                    value={formData.title || ''}
                    onChange={(e) => handleFormChange('title', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Priority</InputLabel>
                    <Select
                      value={formData.priority || 'medium'}
                      onChange={(e) => handleFormChange('priority', e.target.value)}
                    >
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="urgent">Urgent</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    multiline
                    rows={3}
                    value={formData.description || ''}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Planned Start Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={formData.planned_start_date || ''}
                    onChange={(e) => handleFormChange('planned_start_date', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Estimated Hours"
                    type="number"
                    value={formData.estimated_hours || ''}
                    onChange={(e) => handleFormChange('estimated_hours', e.target.value)}
                  />
                </Grid>
              </>
            )}

            {/* View Estimation Dialog */}
            {dialogType === 'viewEstimation' && estimationDetails && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Estimation: {estimationDetails.estimation.estimation_id}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Case: {estimationDetails.estimation.case_number} - {estimationDetails.estimation.project_name}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  Total Value: ₹{parseFloat(estimationDetails.estimation.total_final_price || 0).toLocaleString()}
                </Typography>

                <Divider sx={{ my: 2 }} />

                {estimationDetails.sections.map((section, sectionIndex) => (
                  <Accordion key={section.section_id} defaultExpanded={sectionIndex === 0}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {section.section_name}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {section.subsections && section.subsections.length > 0 ? (
                        section.subsections.map(subsection => (
                          <Box key={subsection.subsection_id} sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" fontWeight="medium" color="primary" gutterBottom>
                              {subsection.subsection_name}
                            </Typography>
                            <List dense>
                              {subsection.items.map(item => (
                                <ListItem key={item.id}>
                                  <ListItemText
                                    primary={`${item.product_name} (${item.part_code || 'N/A'})`}
                                    secondary={`Qty: ${item.quantity} | Price: ₹${parseFloat(item.final_price || 0).toLocaleString()}`}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </Box>
                        ))
                      ) : section.items ? (
                        <List dense>
                          {section.items.map(item => (
                            <ListItem key={item.id}>
                              <ListItemText
                                primary={`${item.product_name} (${item.part_code || 'N/A'})`}
                                secondary={`Qty: ${item.quantity} | Price: ₹${parseFloat(item.final_price || 0).toLocaleString()}`}
                              />
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No items in this section
                        </Typography>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )}

            {/* Move to Production Dialog */}
            {dialogType === 'moveToProduction' && (
              <>
                <Grid item xs={12}>
                  <Alert severity="info">
                    Moving case "{selectedItem?.case_number}" to production phase.
                  </Alert>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Planned Start Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={formData.planned_start_date || ''}
                    onChange={(e) => handleFormChange('planned_start_date', e.target.value)}
                    required
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Planned End Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={formData.planned_end_date || ''}
                    onChange={(e) => handleFormChange('planned_end_date', e.target.value)}
                    required
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Manufacturing Unit</InputLabel>
                    <Select
                      value={formData.manufacturing_unit_id || ''}
                      onChange={(e) => handleFormChange('manufacturing_unit_id', e.target.value)}
                      required
                    >
                      {manufacturingUnits.map(unit => (
                        <MenuItem key={unit.id} value={unit.id}>
                          {unit.unit_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Priority</InputLabel>
                    <Select
                      value={formData.priority || 'medium'}
                      onChange={(e) => handleFormChange('priority', e.target.value)}
                    >
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="urgent">Urgent</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes"
                    multiline
                    rows={3}
                    value={formData.notes || ''}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                    placeholder="Additional notes for manufacturing..."
                  />
                </Grid>
              </>
            )}

            {/* View Work Orders Dialog */}
            {dialogType === 'viewWorkOrders' && selectedItem && (
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Work Orders for Manufacturing Case: {selectedItem.manufacturing_case_number}
                </Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Work Order #</TableCell>
                        <TableCell>Operation</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Estimated Hours</TableCell>
                        <TableCell>Actual Hours</TableCell>
                        <TableCell>Progress</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {workOrders.map((wo) => (
                        <TableRow key={wo.id}>
                          <TableCell>{wo.work_order_number}</TableCell>
                          <TableCell>{wo.operation_name || 'N/A'}</TableCell>
                          <TableCell>
                            <Chip
                              label={wo.status.replace('_', ' ').toUpperCase()}
                              color={getStatusColor(wo.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{wo.estimated_hours || 0}h</TableCell>
                          <TableCell>{wo.actual_hours || 0}h</TableCell>
                          <TableCell>
                            {wo.estimated_hours > 0 ?
                              Math.round((parseFloat(wo.actual_hours || 0) / parseFloat(wo.estimated_hours)) * 100) : 0}%
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => handleEditWorkOrder(wo)}
                              title="Edit Work Order"
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteWorkOrder(wo.id, wo.work_order_number)}
                              title="Delete Work Order"
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            )}

            {/* Update Progress Dialog */}
            {dialogType === 'updateProgress' && (
              <>
                <Grid item xs={12}>
                  <Alert severity="info">
                    Update progress for Manufacturing Case: {selectedItem?.manufacturing_case_number}
                  </Alert>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Progress Percentage"
                    type="number"
                    inputProps={{ min: 0, max: 100 }}
                    value={formData.progress_percentage || selectedItem?.progress_percentage || 0}
                    onChange={(e) => handleFormChange('progress_percentage', e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Progress Notes"
                    multiline
                    rows={3}
                    value={formData.notes || ''}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                    placeholder="Enter progress update notes..."
                  />
                </Grid>
              </>
            )}

            {/* View Manufacturing Case Details Dialog */}
            {dialogType === 'viewManufacturingCase' && selectedItem && (
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Manufacturing Case Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography><strong>Case Number:</strong> {selectedItem.manufacturing_case_number}</Typography>
                    <Typography><strong>Project:</strong> {selectedItem.project_name}</Typography>
                    <Typography><strong>Client:</strong> {selectedItem.client_name}</Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography><strong>Status:</strong></Typography>
                      <Chip
                        label={selectedItem.status.replace('_', ' ').toUpperCase()}
                        color={getStatusColor(selectedItem.status)}
                        size="small"
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography><strong>Progress:</strong> {parseFloat(selectedItem.progress_percentage) || 0}%</Typography>
                    <Typography><strong>Planned Start:</strong> {selectedItem.planned_start_date || 'TBD'}</Typography>
                    <Typography><strong>Planned End:</strong> {selectedItem.planned_end_date || 'TBD'}</Typography>
                    <Typography><strong>Actual Start:</strong> {selectedItem.actual_start_date || 'Not Started'}</Typography>
                  </Grid>
                  {selectedItem.notes && (
                    <Grid item xs={12}>
                      <Typography><strong>Notes:</strong></Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 1, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                        {selectedItem.notes}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Grid>
            )}

            {/* View BOM Dialog */}
            {dialogType === 'viewBOM' && selectedItem && (
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  BOM Details: {selectedItem.bom_number}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography><strong>BOM Number:</strong> {selectedItem.bom_number}</Typography>
                    <Typography><strong>Production Item:</strong> {selectedItem.item_code}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <Typography><strong>Status:</strong></Typography>
                      <Chip
                        label={selectedItem.status.toUpperCase()}
                        color={selectedItem.status === 'active' ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography><strong>Material Cost:</strong> ₹{selectedItem.material_cost || 0}</Typography>
                    <Typography><strong>Created:</strong> {new Date(selectedItem.created_at).toLocaleDateString()}</Typography>
                    <Typography><strong>Created By:</strong> {selectedItem.created_by_name}</Typography>
                  </Grid>
                </Grid>

                {bomComponents.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      BOM Components
                    </Typography>
                    <TableContainer component={Paper}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Line</TableCell>
                            <TableCell>Component Type</TableCell>
                            <TableCell>Component ID</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Quantity</TableCell>
                            <TableCell>Unit Cost</TableCell>
                            <TableCell>Total Cost</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {bomComponents.map((component, index) => (
                            <TableRow key={`bom-component-${component.line_number || component.component_id}-${index}`}>
                              <TableCell>{component.line_number}</TableCell>
                              <TableCell>{component.component_type}</TableCell>
                              <TableCell>{component.component_id}</TableCell>
                              <TableCell>{component.description || 'N/A'}</TableCell>
                              <TableCell>{component.quantity || 0}</TableCell>
                              <TableCell>₹{component.unit_cost || 0}</TableCell>
                              <TableCell>₹{(component.quantity || 0) * (component.unit_cost || 0)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                {bomComponents.length === 0 && (
                  <Box sx={{ mt: 3, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                      No components found for this BOM
                    </Typography>
                  </Box>
                )}
              </Grid>
            )}

            {/* Edit Manufacturing Case Dialog */}
            {dialogType === 'editManufacturingCase' && (
              <>
                <Grid item xs={12}>
                  <Alert severity="info">
                    Edit Manufacturing Case: {selectedItem?.manufacturing_case_number}
                  </Alert>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status || selectedItem?.status || 'draft'}
                      onChange={(e) => handleFormChange('status', e.target.value)}
                      label="Status"
                    >
                      <MenuItem value="draft">Draft</MenuItem>
                      <MenuItem value="planned">Planned</MenuItem>
                      <MenuItem value="in_progress">In Progress</MenuItem>
                      <MenuItem value="on_hold">On Hold</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                      <MenuItem value="cancelled">Cancelled</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Priority</InputLabel>
                    <Select
                      value={formData.priority || selectedItem?.priority || 'medium'}
                      onChange={(e) => handleFormChange('priority', e.target.value)}
                      label="Priority"
                    >
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="urgent">Urgent</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Planned Start Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={formData.planned_start_date || selectedItem?.planned_start_date || ''}
                    onChange={(e) => handleFormChange('planned_start_date', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Planned End Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={formData.planned_end_date || selectedItem?.planned_end_date || ''}
                    onChange={(e) => handleFormChange('planned_end_date', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes"
                    multiline
                    rows={3}
                    value={formData.notes || selectedItem?.notes || ''}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>
            {['viewEstimation', 'viewWorkOrders', 'viewManufacturingCase', 'viewBOM'].includes(dialogType) ? 'Close' : 'Cancel'}
          </Button>
          {!['viewEstimation', 'viewWorkOrders', 'viewManufacturingCase', 'viewBOM'].includes(dialogType) && (
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading}
            >
              {loading ? 'Processing...' :
                dialogType === 'moveToProduction' ? 'Start Production' :
                  dialogType === 'updateProgress' ? 'Update Progress' :
                    dialogType === 'editManufacturingCase' ? 'Save Changes' :
                      selectedItem ? 'Update' : 'Create'
              }
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Edit Work Order Dialog */}
      <Dialog
        open={editWorkOrderDialogOpen}
        onClose={() => setEditWorkOrderDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Work Order</DialogTitle>
        <DialogContent>
          {selectedWorkOrder && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Work Order Number"
                  value={selectedWorkOrder.work_order_number || ''}
                  disabled
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Operation Name"
                  value={selectedWorkOrder.operation_name || ''}
                  onChange={(e) => setSelectedWorkOrder({
                    ...selectedWorkOrder,
                    operation_name: e.target.value
                  })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={selectedWorkOrder.status || 'pending'}
                    onChange={(e) => setSelectedWorkOrder({
                      ...selectedWorkOrder,
                      status: e.target.value
                    })}
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="on_hold">On Hold</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Estimated Hours"
                  type="number"
                  value={selectedWorkOrder.estimated_hours || ''}
                  onChange={(e) => setSelectedWorkOrder({
                    ...selectedWorkOrder,
                    estimated_hours: e.target.value
                  })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Actual Hours"
                  type="number"
                  value={selectedWorkOrder.actual_hours || ''}
                  onChange={(e) => setSelectedWorkOrder({
                    ...selectedWorkOrder,
                    actual_hours: e.target.value
                  })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Planned Start Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={selectedWorkOrder.planned_start_date ? selectedWorkOrder.planned_start_date.split('T')[0] : ''}
                  onChange={(e) => setSelectedWorkOrder({
                    ...selectedWorkOrder,
                    planned_start_date: e.target.value
                  })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Actual Start Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={selectedWorkOrder.actual_start_date ? selectedWorkOrder.actual_start_date.split('T')[0] : ''}
                  onChange={(e) => setSelectedWorkOrder({
                    ...selectedWorkOrder,
                    actual_start_date: e.target.value
                  })}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditWorkOrderDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveWorkOrder}
            disabled={loading}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProductionManagement;