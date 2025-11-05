import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Tabs,
  Tab,
  LinearProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  CalendarToday,
  Delete,
  Assessment,
  TrendingUp,
  Add,
  Refresh,
  Schedule,
  Speed,
  BarChart,
} from '@mui/icons-material';

interface ProductionSchedule {
  id: number;
  schedule_code: string;
  schedule_name: string;
  schedule_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  start_date: string;
  end_date: string;
  status: 'draft' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  total_work_orders: number;
  completed_work_orders: number;
}

interface WasteCategory {
  id: number;
  category_code: string;
  category_name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface WasteRecord {
  id: number;
  work_order_number?: string;
  category_name?: string;
  product_name?: string;
  waste_date: string;
  quantity_wasted: number;
  waste_quantity?: number;
  unit_cost: number;
  total_waste_cost: number;
  waste_reason: string;
}

interface OEERecord {
  id: number;
  machine_name?: string;
  calculation_date: string;
  shift: string;
  availability_percentage: number;
  performance_percentage: number;
  quality_percentage: number;
  oee_percentage: number;
  target_oee: number;
}

interface PlanningMetrics {
  total_schedules: number;
  active_schedules: number;
  total_waste_cost_month: number;
  average_oee: number;
  schedules_on_track: number;
  schedules_delayed: number;
}

const defaultMetrics: PlanningMetrics = {
  total_schedules: 0,
  active_schedules: 0,
  total_waste_cost_month: 0,
  average_oee: 0,
  schedules_on_track: 0,
  schedules_delayed: 0,
};

const PlanningDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);

  // Data states
  const [metrics, setMetrics] = useState<PlanningMetrics>(defaultMetrics);
  const [schedules, setSchedules] = useState<ProductionSchedule[]>([]);
  const [wasteCategories, setWasteCategories] = useState<WasteCategory[]>([]);
  const [wasteRecords, setWasteRecords] = useState<WasteRecord[]>([]);
  const [oeeRecords, setOEERecords] = useState<OEERecord[]>([]);

  // Dialog states
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [wasteDialog, setWasteDialog] = useState(false);
  const [oeeDialog, setOEEDialog] = useState(false);

  // Form states
  const [newSchedule, setNewSchedule] = useState({
    schedule_code: '',
    schedule_name: '',
    schedule_type: 'weekly',
    start_date: '',
    end_date: '',
    notes: '',
  });

  const [newWaste, setNewWaste] = useState({
    work_order_id: '',
    waste_category_id: '',
    product_id: '',
    quantity_wasted: '',
    unit_cost: '',
    waste_reason: '',
    root_cause: '',
  });

  const [newOEE, setNewOEE] = useState({
    machine_id: '',
    calculation_date: new Date().toISOString().split('T')[0],
    shift: 'Morning',
    available_time_minutes: '480',
    planned_downtime_minutes: '30',
    unplanned_downtime_minutes: '0',
    ideal_cycle_time_minutes: '2',
    total_units_produced: '',
    good_units: '',
    rejected_units: '',
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setMetrics({ ...defaultMetrics });
    try {
      await Promise.all([
        fetchSchedules(),
        fetchWasteCategories(),
        fetchWasteRecords(),
        fetchOEERecords(),
      ]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async () => {
    try {
      const response = await fetch('/api/production/planning/schedules', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('vtria_token')}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        const data = Array.isArray(result.data) ? result.data : [];
        setSchedules(data);

        // Calculate metrics from schedules
        const total = data.length;
        const active = data.filter((s: ProductionSchedule) =>
          s.status === 'approved' || s.status === 'in_progress'
        ).length;

        setMetrics(prev => ({
          ...prev,
          total_schedules: total,
          active_schedules: active,
          schedules_on_track: 0,
          schedules_delayed: 0,
        }));
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const fetchWasteCategories = async () => {
    try {
      const response = await fetch('/api/production/planning/waste/categories', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('vtria_token')}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        setWasteCategories(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching waste categories:', error);
    }
  };

  const fetchWasteRecords = async () => {
    try {
      const response = await fetch('/api/production/planning/waste/records', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('vtria_token')}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        const data = Array.isArray(result.data) ? result.data : [];
        const normalizedRecords: WasteRecord[] = data.map((record: any) => {
          const quantity = Number(record.quantity_wasted ?? record.waste_quantity ?? 0);
          const totalCost = Number(record.total_waste_cost ?? record.total_cost ?? 0);
          return {
            ...record,
            quantity_wasted: quantity,
            waste_quantity: quantity,
            unit_cost: Number(record.unit_cost ?? 0),
            total_waste_cost: totalCost,
          };
        });

        setWasteRecords(normalizedRecords);

        // Calculate total waste cost
        const totalCost = normalizedRecords.reduce((sum, record) =>
          sum + (record.total_waste_cost || 0), 0
        );

        setMetrics(prev => ({
          ...prev,
          total_waste_cost_month: totalCost,
        }));
      }
    } catch (error) {
      console.error('Error fetching waste records:', error);
    }
  };

  const fetchOEERecords = async () => {
    try {
      const response = await fetch('/api/production/planning/oee/records', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('vtria_token')}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        const data = Array.isArray(result.data) ? result.data : [];
        const normalizedRecords: OEERecord[] = data.map((record: any) => ({
          ...record,
          availability_percentage: Number(record.availability_percentage ?? 0),
          performance_percentage: Number(record.performance_percentage ?? 0),
          quality_percentage: Number(record.quality_percentage ?? 0),
          oee_percentage: Number(record.oee_percentage ?? 0),
          target_oee: Number(record.target_oee ?? 0),
        }));

        setOEERecords(normalizedRecords);

        // Calculate average OEE
        const avgOEE = normalizedRecords.length > 0
          ? normalizedRecords.reduce((sum, record) => sum + (record.oee_percentage || 0), 0) / normalizedRecords.length
          : 0;

        setMetrics(prev => ({
          ...prev,
          average_oee: avgOEE,
        }));
      }
    } catch (error) {
      console.error('Error fetching OEE records:', error);
    }
  };

  const handleCreateSchedule = async () => {
    try {
      const response = await fetch('/api/production/planning/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('vtria_token')}`,
        },
        body: JSON.stringify(newSchedule),
      });

      if (response.ok) {
        setScheduleDialog(false);
        setNewSchedule({
          schedule_code: '',
          schedule_name: '',
          schedule_type: 'weekly',
          start_date: '',
          end_date: '',
          notes: '',
        });
        fetchSchedules();
      }
    } catch (error) {
      console.error('Error creating schedule:', error);
    }
  };

  const handleRecordWaste = async () => {
    try {
      const response = await fetch('/api/production/planning/waste/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('vtria_token')}`,
        },
        body: JSON.stringify({
          ...newWaste,
          work_order_id: parseInt(newWaste.work_order_id),
          waste_category_id: parseInt(newWaste.waste_category_id),
          product_id: parseInt(newWaste.product_id),
          quantity_wasted: parseFloat(newWaste.quantity_wasted),
          unit_cost: parseFloat(newWaste.unit_cost),
        }),
      });

      if (response.ok) {
        setWasteDialog(false);
        setNewWaste({
          work_order_id: '',
          waste_category_id: '',
          product_id: '',
          quantity_wasted: '',
          unit_cost: '',
          waste_reason: '',
          root_cause: '',
        });
        fetchWasteRecords();
      }
    } catch (error) {
      console.error('Error recording waste:', error);
    }
  };

  const handleCalculateOEE = async () => {
    try {
      const response = await fetch('/api/production/planning/oee/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('vtria_token')}`,
        },
        body: JSON.stringify({
          ...newOEE,
          machine_id: parseInt(newOEE.machine_id),
          available_time_minutes: parseInt(newOEE.available_time_minutes),
          planned_downtime_minutes: parseInt(newOEE.planned_downtime_minutes),
          unplanned_downtime_minutes: parseInt(newOEE.unplanned_downtime_minutes),
          ideal_cycle_time_minutes: parseFloat(newOEE.ideal_cycle_time_minutes),
          total_units_produced: parseInt(newOEE.total_units_produced),
          good_units: parseInt(newOEE.good_units),
          rejected_units: parseInt(newOEE.rejected_units),
        }),
      });

      if (response.ok) {
        setOEEDialog(false);
        setNewOEE({
          machine_id: '',
          calculation_date: new Date().toISOString().split('T')[0],
          shift: 'Morning',
          available_time_minutes: '480',
          planned_downtime_minutes: '30',
          unplanned_downtime_minutes: '0',
          ideal_cycle_time_minutes: '2',
          total_units_produced: '',
          good_units: '',
          rejected_units: '',
        });
        fetchOEERecords();
      }
    } catch (error) {
      console.error('Error calculating OEE:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      case 'approved': return 'primary';
      case 'cancelled': return 'error';
      case 'draft': return 'default';
      default: return 'default';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getOEEColor = (oee: number, target: number) => {
    if (oee >= target) return 'success';
    if (oee >= target * 0.9) return 'warning';
    return 'error';
  };

  const parsedMetrics = {
    averageOEE: Number(metrics.average_oee ?? 0),
    totalWasteCostMonth: Number(metrics.total_waste_cost_month ?? 0),
    activeSchedules: Number(metrics.active_schedules ?? 0),
    totalSchedules: Number(metrics.total_schedules ?? 0),
    schedulesOnTrack: Number(metrics.schedules_on_track ?? 0),
    schedulesDelayed: Number(metrics.schedules_delayed ?? 0),
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Production Planning Dashboard
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadDashboardData}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setScheduleDialog(true)}
          >
            New Schedule
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Active Schedules
                  </Typography>
                  <Typography variant="h4">
                    {parsedMetrics.activeSchedules}
                  </Typography>
                  <Typography variant="caption">
                    of {parsedMetrics.totalSchedules} total
                  </Typography>
                </Box>
                <Schedule sx={{ fontSize: 48, color: 'primary.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Average OEE
                  </Typography>
                  <Typography
                    variant="h4"
                    color={parsedMetrics.averageOEE >= 85 ? 'success.main' : 'warning.main'}
                  >
                    {parsedMetrics.averageOEE.toFixed(1)}%
                  </Typography>
                </Box>
                <Speed sx={{ fontSize: 48, color: 'success.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Waste Cost (Month)
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    ₹{parsedMetrics.totalWasteCostMonth.toLocaleString()}
                  </Typography>
                </Box>
                <Delete sx={{ fontSize: 48, color: 'error.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Schedule Performance
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {parsedMetrics.schedulesOnTrack}
                  </Typography>
                  <Typography variant="caption" color="error.main">
                    {parsedMetrics.schedulesDelayed} Delayed
                  </Typography>
                </Box>
                <Assessment sx={{ fontSize: 48, color: 'info.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Production Schedules" />
          <Tab label="Waste Tracking" />
          <Tab label="OEE Analytics" />
          <Tab label="Capacity Planning" />
        </Tabs>

        {/* Schedules Tab */}
        {tabValue === 0 && (
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Start Date</TableCell>
                    <TableCell>End Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Work Orders</TableCell>
                    <TableCell>Completion %</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell>{schedule.schedule_code}</TableCell>
                      <TableCell>{schedule.schedule_name}</TableCell>
                      <TableCell>
                        <Chip label={schedule.schedule_type} size="small" />
                      </TableCell>
                      <TableCell>
                        {new Date(schedule.start_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(schedule.end_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={schedule.status}
                          color={getStatusColor(schedule.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {schedule.completed_work_orders}/{schedule.total_work_orders}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ width: '100%', mr: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={(schedule.completed_work_orders / schedule.total_work_orders) * 100 || 0}
                            />
                          </Box>
                          <Box sx={{ minWidth: 35 }}>
                            <Typography variant="body2" color="text.secondary">
                              {Math.round((schedule.completed_work_orders / schedule.total_work_orders) * 100 || 0)}%
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}

        {/* Waste Tracking Tab */}
        {tabValue === 1 && (
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Waste Categories: {wasteCategories.length}</Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setWasteDialog(true)}
              >
                Record Waste
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Work Order</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell>Qty Wasted</TableCell>
                    <TableCell>Unit Cost</TableCell>
                    <TableCell>Total Cost</TableCell>
                    <TableCell>Reason</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {wasteRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {new Date(record.waste_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{record.work_order_number || '-'}</TableCell>
                      <TableCell>{record.category_name || '-'}</TableCell>
                      <TableCell>{record.product_name || '-'}</TableCell>
                      <TableCell>{record.quantity_wasted}</TableCell>
                      <TableCell>₹{record.unit_cost.toFixed(2)}</TableCell>
                      <TableCell>
                        <Typography color="error.main" fontWeight="bold">
                          ₹{record.total_waste_cost.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={record.waste_reason}>
                          <Typography noWrap sx={{ maxWidth: 200 }}>
                            {record.waste_reason}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}

        {/* OEE Analytics Tab */}
        {tabValue === 2 && (
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setOEEDialog(true)}
              >
                Calculate OEE
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Machine</TableCell>
                    <TableCell>Shift</TableCell>
                    <TableCell>Availability</TableCell>
                    <TableCell>Performance</TableCell>
                    <TableCell>Quality</TableCell>
                    <TableCell>OEE</TableCell>
                    <TableCell>Target</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {oeeRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {new Date(record.calculation_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{record.machine_name || record.id}</TableCell>
                      <TableCell>
                        <Chip label={record.shift} size="small" />
                      </TableCell>
                      <TableCell>{record.availability_percentage.toFixed(1)}%</TableCell>
                      <TableCell>{record.performance_percentage.toFixed(1)}%</TableCell>
                      <TableCell>{record.quality_percentage.toFixed(1)}%</TableCell>
                      <TableCell>
                        <Typography
                          fontWeight="bold"
                          color={getOEEColor(record.oee_percentage, record.target_oee)}
                        >
                          {record.oee_percentage.toFixed(1)}%
                        </Typography>
                      </TableCell>
                      <TableCell>{record.target_oee}%</TableCell>
                      <TableCell>
                        <Chip
                          label={record.oee_percentage >= record.target_oee ? 'Met' : 'Below'}
                          color={getOEEColor(record.oee_percentage, record.target_oee)}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}

        {/* Capacity Planning Tab */}
        {tabValue === 3 && (
          <CardContent>
            <Alert severity="info">
              Capacity planning and resource allocation charts will be displayed here.
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Create Schedule Dialog */}
      <Dialog open={scheduleDialog} onClose={() => setScheduleDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Production Schedule</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Schedule Code"
              value={newSchedule.schedule_code}
              onChange={(e) => setNewSchedule({ ...newSchedule, schedule_code: e.target.value })}
              fullWidth
            />
            <TextField
              label="Schedule Name"
              value={newSchedule.schedule_name}
              onChange={(e) => setNewSchedule({ ...newSchedule, schedule_name: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Schedule Type</InputLabel>
              <Select
                value={newSchedule.schedule_type}
                onChange={(e) => setNewSchedule({ ...newSchedule, schedule_type: e.target.value })}
                label="Schedule Type"
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="custom">Custom</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Start Date"
              type="date"
              value={newSchedule.start_date}
              onChange={(e) => setNewSchedule({ ...newSchedule, start_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Date"
              type="date"
              value={newSchedule.end_date}
              onChange={(e) => setNewSchedule({ ...newSchedule, end_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Notes"
              multiline
              rows={2}
              value={newSchedule.notes}
              onChange={(e) => setNewSchedule({ ...newSchedule, notes: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateSchedule} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Record Waste Dialog */}
      <Dialog open={wasteDialog} onClose={() => setWasteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Production Waste</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Work Order ID"
              type="number"
              value={newWaste.work_order_id}
              onChange={(e) => setNewWaste({ ...newWaste, work_order_id: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Waste Category</InputLabel>
              <Select
                value={newWaste.waste_category_id}
                onChange={(e) => setNewWaste({ ...newWaste, waste_category_id: e.target.value })}
                label="Waste Category"
              >
                {wasteCategories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.category_name} ({cat.severity})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Product ID"
              type="number"
              value={newWaste.product_id}
              onChange={(e) => setNewWaste({ ...newWaste, product_id: e.target.value })}
              fullWidth
            />
            <TextField
              label="Quantity Wasted"
              type="number"
              value={newWaste.quantity_wasted}
              onChange={(e) => setNewWaste({ ...newWaste, quantity_wasted: e.target.value })}
              fullWidth
            />
            <TextField
              label="Unit Cost (₹)"
              type="number"
              value={newWaste.unit_cost}
              onChange={(e) => setNewWaste({ ...newWaste, unit_cost: e.target.value })}
              fullWidth
            />
            <TextField
              label="Waste Reason"
              multiline
              rows={2}
              value={newWaste.waste_reason}
              onChange={(e) => setNewWaste({ ...newWaste, waste_reason: e.target.value })}
              fullWidth
            />
            <TextField
              label="Root Cause"
              multiline
              rows={2}
              value={newWaste.root_cause}
              onChange={(e) => setNewWaste({ ...newWaste, root_cause: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWasteDialog(false)}>Cancel</Button>
          <Button onClick={handleRecordWaste} variant="contained">
            Record
          </Button>
        </DialogActions>
      </Dialog>

      {/* Calculate OEE Dialog */}
      <Dialog open={oeeDialog} onClose={() => setOEEDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Calculate OEE</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Machine ID"
                  type="number"
                  value={newOEE.machine_id}
                  onChange={(e) => setNewOEE({ ...newOEE, machine_id: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Date"
                  type="date"
                  value={newOEE.calculation_date}
                  onChange={(e) => setNewOEE({ ...newOEE, calculation_date: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Shift</InputLabel>
                  <Select
                    value={newOEE.shift}
                    onChange={(e) => setNewOEE({ ...newOEE, shift: e.target.value })}
                    label="Shift"
                  >
                    <MenuItem value="Morning">Morning</MenuItem>
                    <MenuItem value="Afternoon">Afternoon</MenuItem>
                    <MenuItem value="Night">Night</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Availability Metrics
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="Available Time (min)"
                  type="number"
                  value={newOEE.available_time_minutes}
                  onChange={(e) => setNewOEE({ ...newOEE, available_time_minutes: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="Planned Downtime (min)"
                  type="number"
                  value={newOEE.planned_downtime_minutes}
                  onChange={(e) => setNewOEE({ ...newOEE, planned_downtime_minutes: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="Unplanned Downtime (min)"
                  type="number"
                  value={newOEE.unplanned_downtime_minutes}
                  onChange={(e) => setNewOEE({ ...newOEE, unplanned_downtime_minutes: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Performance Metrics
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Ideal Cycle Time (min)"
                  type="number"
                  value={newOEE.ideal_cycle_time_minutes}
                  onChange={(e) => setNewOEE({ ...newOEE, ideal_cycle_time_minutes: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Total Units Produced"
                  type="number"
                  value={newOEE.total_units_produced}
                  onChange={(e) => setNewOEE({ ...newOEE, total_units_produced: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Quality Metrics
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Good Units"
                  type="number"
                  value={newOEE.good_units}
                  onChange={(e) => setNewOEE({ ...newOEE, good_units: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Rejected Units"
                  type="number"
                  value={newOEE.rejected_units}
                  onChange={(e) => setNewOEE({ ...newOEE, rejected_units: e.target.value })}
                  fullWidth
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOEEDialog(false)}>Cancel</Button>
          <Button onClick={handleCalculateOEE} variant="contained">
            Calculate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PlanningDashboard;
