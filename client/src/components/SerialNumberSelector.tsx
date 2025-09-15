import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Typography,
  Box,
  Chip,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  IconButton,
  Paper,
  Divider,
} from '@mui/material';
import {
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { InventorySerialNumber, EstimationItem } from '../types';

interface SerialNumberSelectorProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedSerials: SelectedSerial[]) => void;
  estimationItem: EstimationItem;
  locationId: number;
}

interface SerialWithDetails extends InventorySerialNumber {
  unit_cost: number;
  batch_number?: string;
  purchase_date: string;
  performance_rating?: 'excellent' | 'good' | 'average' | 'poor' | 'unrated';
  failure_count: number;
  availability_status: 'AVAILABLE' | 'NOT_AVAILABLE' | 'WARRANTY_EXPIRED' | 'WARRANTY_EXPIRING';
  compatibility_score: number;
}

interface SelectedSerial {
  serial_number_id: number;
  serial_number: string;
  unit_cost: number;
  allocation_reason: string;
  technical_specification?: string;
}

const SerialNumberSelector: React.FC<SerialNumberSelectorProps> = ({
  open,
  onClose,
  onConfirm,
  estimationItem,
  locationId,
}) => {
  const [availableSerials, setAvailableSerials] = useState<SerialWithDetails[]>([]);
  const [selectedSerials, setSelectedSerials] = useState<SelectedSerial[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('compatibility_score');
  const [allocationReason, setAllocationReason] = useState<string>('technical_compatibility');

  useEffect(() => {
    if (open) {
      fetchAvailableSerials();
    }
  }, [open, estimationItem.product_id, locationId]);

  const fetchAvailableSerials = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/inventory/serial-numbers/available?product_id=${estimationItem.product_id}&location_id=${locationId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        setAvailableSerials(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch available serial numbers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'success';
      case 'WARRANTY_EXPIRING':
        return 'warning';
      case 'WARRANTY_EXPIRED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPerformanceColor = (rating: string) => {
    switch (rating) {
      case 'excellent':
        return '#4caf50';
      case 'good':
        return '#8bc34a';
      case 'average':
        return '#ff9800';
      case 'poor':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };

  const getCompatibilityIcon = (score: number) => {
    if (score >= 90) return <CheckIcon color="success" />;
    if (score >= 70) return <InfoIcon color="info" />;
    if (score >= 50) return <WarningIcon color="warning" />;
    return <ErrorIcon color="error" />;
  };

  const handleSerialSelection = (serial: SerialWithDetails, isSelected: boolean) => {
    if (isSelected && selectedSerials.length < estimationItem.quantity) {
      setSelectedSerials(prev => [
        ...prev,
        {
          serial_number_id: serial.id,
          serial_number: serial.serial_number,
          unit_cost: serial.unit_cost,
          allocation_reason: allocationReason,
          technical_specification: '',
        },
      ]);
    } else if (!isSelected) {
      setSelectedSerials(prev =>
        prev.filter(s => s.serial_number_id !== serial.id)
      );
    }
  };

  const filteredSerials = availableSerials
    .filter(serial => {
      const matchesSearch = serial.serial_number
        .toLowerCase()
        .includes(searchFilter.toLowerCase()) ||
        serial.batch_number?.toLowerCase().includes(searchFilter.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || serial.availability_status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'compatibility_score':
          return b.compatibility_score - a.compatibility_score;
        case 'unit_cost':
          return a.unit_cost - b.unit_cost;
        case 'warranty_end_date':
          return new Date(b.warranty_end_date || '').getTime() - new Date(a.warranty_end_date || '').getTime();
        case 'performance_rating':
          const ratingOrder = { excellent: 4, good: 3, average: 2, poor: 1, unrated: 0 };
          return (ratingOrder[b.performance_rating || 'unrated'] || 0) - (ratingOrder[a.performance_rating || 'unrated'] || 0);
        default:
          return 0;
      }
    });

  const totalSelectedCost = selectedSerials.reduce((sum, s) => sum + s.unit_cost, 0);
  const averageSelectedCost = selectedSerials.length > 0 ? totalSelectedCost / selectedSerials.length : 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Select Serial Numbers for {estimationItem.product?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Required: {estimationItem.quantity} | Selected: {selectedSerials.length}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Filters and Search */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label="Search Serial Number"
            variant="outlined"
            size="small"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
            }}
            sx={{ minWidth: 200 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status Filter</InputLabel>
            <Select
              value={statusFilter}
              label="Status Filter"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="AVAILABLE">Available</MenuItem>
              <MenuItem value="WARRANTY_EXPIRING">Warranty Expiring</MenuItem>
              <MenuItem value="WARRANTY_EXPIRED">Warranty Expired</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={(e) => setSortBy(e.target.value)}
            >
              <MenuItem value="compatibility_score">Compatibility</MenuItem>
              <MenuItem value="unit_cost">Unit Cost</MenuItem>
              <MenuItem value="warranty_end_date">Warranty</MenuItem>
              <MenuItem value="performance_rating">Performance</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Allocation Reason</InputLabel>
            <Select
              value={allocationReason}
              label="Allocation Reason"
              onChange={(e) => setAllocationReason(e.target.value)}
            >
              <MenuItem value="performance_requirement">Performance Requirement</MenuItem>
              <MenuItem value="warranty_requirement">Warranty Requirement</MenuItem>
              <MenuItem value="client_specification">Client Specification</MenuItem>
              <MenuItem value="technical_compatibility">Technical Compatibility</MenuItem>
              <MenuItem value="cost_optimization">Cost Optimization</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Selection Summary */}
        {selectedSerials.length > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Selection Summary: {selectedSerials.length} of {estimationItem.quantity} selected
            </Typography>
            <Typography variant="body2">
              Total Cost: ₹{totalSelectedCost.toLocaleString('en-IN')} | 
              Average Cost: ₹{averageSelectedCost.toLocaleString('en-IN')} per unit
            </Typography>
          </Alert>
        )}

        {/* Serial Numbers Table */}
        <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">Select</TableCell>
                <TableCell>Serial Number</TableCell>
                <TableCell>Batch Info</TableCell>
                <TableCell align="right">Unit Cost</TableCell>
                <TableCell>Warranty</TableCell>
                <TableCell>Performance</TableCell>
                <TableCell>Compatibility</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    Loading serial numbers...
                  </TableCell>
                </TableRow>
              ) : filteredSerials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No serial numbers available
                  </TableCell>
                </TableRow>
              ) : (
                filteredSerials.map((serial) => {
                  const isSelected = selectedSerials.some(s => s.serial_number_id === serial.id);
                  const canSelect = !isSelected && selectedSerials.length < estimationItem.quantity;
                  
                  return (
                    <TableRow key={serial.id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isSelected}
                          onChange={(e) => handleSerialSelection(serial, e.target.checked)}
                          disabled={!canSelect && !isSelected}
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {serial.serial_number}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {serial.condition_status}
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {serial.batch_number || 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(serial.purchase_date).toLocaleDateString('en-IN')}
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          ₹{serial.unit_cost.toLocaleString('en-IN')}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {serial.warranty_end_date ? 
                              new Date(serial.warranty_end_date).toLocaleDateString('en-IN') : 
                              'No Warranty'
                            }
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {serial.warranty_status}
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: getPerformanceColor(serial.performance_rating || 'unrated'),
                            }}
                          />
                          <Typography variant="body2">
                            {serial.performance_rating || 'Unrated'}
                          </Typography>
                          {serial.failure_count > 0 && (
                            <Tooltip title={`${serial.failure_count} failures recorded`}>
                              <Chip 
                                label={serial.failure_count} 
                                size="small" 
                                color="error" 
                                variant="outlined"
                              />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getCompatibilityIcon(serial.compatibility_score)}
                          <Typography variant="body2">
                            {serial.compatibility_score}%
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          label={serial.availability_status.replace('_', ' ')}
                          size="small"
                          color={getStatusColor(serial.availability_status) as any}
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {selectedSerials.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Selected Serial Numbers:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {selectedSerials.map((selected) => (
                <Chip
                  key={selected.serial_number_id}
                  label={`${selected.serial_number} - ₹${selected.unit_cost.toLocaleString('en-IN')}`}
                  onDelete={() => handleSerialSelection(
                    availableSerials.find(s => s.id === selected.serial_number_id)!,
                    false
                  )}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={() => onConfirm(selectedSerials)}
          variant="contained"
          disabled={selectedSerials.length !== estimationItem.quantity}
        >
          Confirm Selection ({selectedSerials.length}/{estimationItem.quantity})
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SerialNumberSelector;