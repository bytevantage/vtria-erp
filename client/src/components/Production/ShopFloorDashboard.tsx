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
  PrecisionManufacturing,
  Engineering,
  TrendingUp,
  TrendingDown,
  Stop,
  PlayArrow,
  Pause,
  Add,
  Refresh,
  Assessment,
  Build,
  Schedule,
  PrecisionManufacturing as Precision,
} from '@mui/icons-material';

interface Machine {
  id: number;
  machine_code: string;
  machine_name: string;
  machine_type: string;
  location: string;
  capacity_per_hour: number;
  status: 'active' | 'maintenance' | 'breakdown' | 'inactive';
  oee_target: number;
}

interface MachineUtilization {
  id: number;
  machine_id: number;
  machine_name?: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  status: 'running' | 'idle' | 'setup' | 'maintenance' | 'breakdown';
  units_produced?: number;
  good_units?: number;
  rejected_units?: number;
}

interface Operation {
  id: number;
  work_order_id: number;
  work_order_number?: string;
  operation_sequence: number;
  operation_name: string;
  machine_name?: string;
  operator_name?: string;
  status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
  estimated_time_minutes: number;
  actual_time_minutes?: number;
  quantity_completed?: number;
}

interface ShopFloorMetrics {
  total_machines: number;
  active_machines: number;
  machines_in_maintenance: number;
  machines_breakdown: number;
  average_utilization: number;
  total_operations_today: number;
  completed_operations_today: number;
  in_progress_operations: number;
}

const ShopFloorDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);

  // Data states
  const [metrics, setMetrics] = useState<ShopFloorMetrics | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [utilization, setUtilization] = useState<MachineUtilization[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);

  // Dialog states
  const [machineDialog, setMachineDialog] = useState(false);
  const [utilizationDialog, setUtilizationDialog] = useState(false);
  const [operationDialog, setOperationDialog] = useState(false);

  // Form states
  const [newMachine, setNewMachine] = useState({
    machine_code: '',
    machine_name: '',
    machine_type: 'cnc',
    location: '',
    capacity_per_hour: '',
    oee_target: '85',
  });

  const [newUtilization, setNewUtilization] = useState({
    machine_id: '',
    status: 'running',
    work_order_id: '',
    shift: 'Morning',
  });

  const [newOperation, setNewOperation] = useState({
    work_order_id: '',
    operation_sequence: '',
    operation_name: '',
    machine_id: '',
    estimated_time_minutes: '',
  });

  useEffect(() => {
    loadDashboardData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchMetrics(),
        fetchMachines(),
        fetchUtilization(),
        fetchOperations(),
      ]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/production/shopfloor/dashboard', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('vtria_token')}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        setMetrics(result.data);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const fetchMachines = async () => {
    try {
      const response = await fetch('/api/production/shopfloor/machines', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('vtria_token')}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        setMachines(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching machines:', error);
    }
  };

  const fetchUtilization = async () => {
    try {
      const response = await fetch('/api/production/shopfloor/machine-utilization', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('vtria_token')}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        setUtilization(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching utilization:', error);
    }
  };

  const fetchOperations = async () => {
    try {
      const response = await fetch('/api/production/shopfloor/operation-tracking', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('vtria_token')}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        setOperations(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching operations:', error);
    }
  };

  const handleCreateMachine = async () => {
    try {
      const response = await fetch('/api/production/shopfloor/machines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('vtria_token')}`,
        },
        body: JSON.stringify({
          ...newMachine,
          capacity_per_hour: parseFloat(newMachine.capacity_per_hour),
          oee_target: parseFloat(newMachine.oee_target),
        }),
      });

      if (response.ok) {
        setMachineDialog(false);
        setNewMachine({
          machine_code: '',
          machine_name: '',
          machine_type: 'cnc',
          location: '',
          capacity_per_hour: '',
          oee_target: '85',
        });
        fetchMachines();
        fetchMetrics();
      }
    } catch (error) {
      console.error('Error creating machine:', error);
    }
  };

  const handleLogUtilization = async () => {
    try {
      const response = await fetch('/api/production/shopfloor/machine-utilization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('vtria_token')}`,
        },
        body: JSON.stringify({
          ...newUtilization,
          machine_id: parseInt(newUtilization.machine_id),
          work_order_id: newUtilization.work_order_id ? parseInt(newUtilization.work_order_id) : undefined,
          start_time: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setUtilizationDialog(false);
        setNewUtilization({
          machine_id: '',
          status: 'running',
          work_order_id: '',
          shift: 'Morning',
        });
        fetchUtilization();
        fetchMetrics();
      }
    } catch (error) {
      console.error('Error logging utilization:', error);
    }
  };

  const handleStartOperation = async () => {
    try {
      const response = await fetch('/api/production/shopfloor/operation-tracking/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('vtria_token')}`,
        },
        body: JSON.stringify({
          ...newOperation,
          work_order_id: parseInt(newOperation.work_order_id),
          operation_sequence: parseInt(newOperation.operation_sequence),
          machine_id: parseInt(newOperation.machine_id),
          estimated_time_minutes: parseInt(newOperation.estimated_time_minutes),
        }),
      });

      if (response.ok) {
        setOperationDialog(false);
        setNewOperation({
          work_order_id: '',
          operation_sequence: '',
          operation_name: '',
          machine_id: '',
          estimated_time_minutes: '',
        });
        fetchOperations();
        fetchMetrics();
      }
    } catch (error) {
      console.error('Error starting operation:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'running':
      case 'completed':
        return 'success';
      case 'maintenance':
      case 'setup':
      case 'paused':
        return 'warning';
      case 'breakdown':
      case 'cancelled':
        return 'error';
      case 'idle':
      case 'inactive':
      case 'pending':
        return 'default';
      case 'in_progress':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
      case 'in_progress':
        return <PlayArrow />;
      case 'paused':
        return <Pause />;
      case 'breakdown':
        return <Stop />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Shop Floor Control Dashboard
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
            onClick={() => setMachineDialog(true)}
          >
            Add Machine
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* KPI Cards */}
      {metrics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Total Machines
                    </Typography>
                    <Typography variant="h4">
                      {metrics.total_machines}
                    </Typography>
                    <Typography variant="caption" color="success.main">
                      {metrics.active_machines} Active
                    </Typography>
                  </Box>
                  <Precision sx={{ fontSize: 48, color: 'primary.main', opacity: 0.3 }} />
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
                      Average Utilization
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {metrics.average_utilization.toFixed(1)}%
                    </Typography>
                  </Box>
                  <TrendingUp sx={{ fontSize: 48, color: 'success.main', opacity: 0.3 }} />
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
                      Operations Today
                    </Typography>
                    <Typography variant="h4">
                      {metrics.completed_operations_today}/{metrics.total_operations_today}
                    </Typography>
                    <Typography variant="caption">
                      Completed
                    </Typography>
                  </Box>
                  <Schedule sx={{ fontSize: 48, color: 'info.main', opacity: 0.3 }} />
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
                      Maintenance/Breakdown
                    </Typography>
                    <Typography variant="h4" color="warning.main">
                      {metrics.machines_in_maintenance}
                    </Typography>
                    <Typography variant="caption" color="error.main">
                      {metrics.machines_breakdown} Breakdown
                    </Typography>
                  </Box>
                  <Build sx={{ fontSize: 48, color: 'warning.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Card>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Machines" />
          <Tab label="Real-time Utilization" />
          <Tab label="Operations Tracking" />
          <Tab label="Performance" />
        </Tabs>

        {/* Machines Tab */}
        {tabValue === 0 && (
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Capacity/hr</TableCell>
                    <TableCell>OEE Target</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {machines.map((machine) => (
                    <TableRow key={machine.id}>
                      <TableCell>{machine.machine_code}</TableCell>
                      <TableCell>{machine.machine_name}</TableCell>
                      <TableCell>
                        <Chip label={machine.machine_type} size="small" />
                      </TableCell>
                      <TableCell>{machine.location}</TableCell>
                      <TableCell>{machine.capacity_per_hour}</TableCell>
                      <TableCell>{machine.oee_target}%</TableCell>
                      <TableCell>
                        <Chip
                          label={machine.status}
                          color={getStatusColor(machine.status)}
                          size="small"
                          icon={getStatusIcon(machine.status) || undefined}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}

        {/* Utilization Tab */}
        {tabValue === 1 && (
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setUtilizationDialog(true)}
              >
                Log Utilization
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Machine</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Start Time</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Units Produced</TableCell>
                    <TableCell>Good/Rejected</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {utilization.map((util) => (
                    <TableRow key={util.id}>
                      <TableCell>{util.machine_name || util.machine_id}</TableCell>
                      <TableCell>
                        <Chip
                          label={util.status}
                          color={getStatusColor(util.status)}
                          size="small"
                          icon={getStatusIcon(util.status) || undefined}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(util.start_time).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {util.duration_minutes ? `${util.duration_minutes} min` : 'In progress'}
                      </TableCell>
                      <TableCell>{util.units_produced || '-'}</TableCell>
                      <TableCell>
                        {util.good_units !== undefined && (
                          <Box>
                            <Chip label={`${util.good_units} good`} size="small" color="success" sx={{ mr: 0.5 }} />
                            {util.rejected_units! > 0 && (
                              <Chip label={`${util.rejected_units} reject`} size="small" color="error" />
                            )}
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}

        {/* Operations Tab */}
        {tabValue === 2 && (
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<PlayArrow />}
                onClick={() => setOperationDialog(true)}
              >
                Start Operation
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Work Order</TableCell>
                    <TableCell>Seq</TableCell>
                    <TableCell>Operation</TableCell>
                    <TableCell>Machine</TableCell>
                    <TableCell>Operator</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Est. Time</TableCell>
                    <TableCell>Actual Time</TableCell>
                    <TableCell>Qty Completed</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {operations.map((op) => (
                    <TableRow key={op.id}>
                      <TableCell>{op.work_order_number || op.work_order_id}</TableCell>
                      <TableCell>{op.operation_sequence}</TableCell>
                      <TableCell>{op.operation_name}</TableCell>
                      <TableCell>{op.machine_name || '-'}</TableCell>
                      <TableCell>{op.operator_name || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={op.status}
                          color={getStatusColor(op.status)}
                          size="small"
                          icon={getStatusIcon(op.status) || undefined}
                        />
                      </TableCell>
                      <TableCell>{op.estimated_time_minutes} min</TableCell>
                      <TableCell>{op.actual_time_minutes ? `${op.actual_time_minutes} min` : '-'}</TableCell>
                      <TableCell>{op.quantity_completed || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}

        {/* Performance Tab */}
        {tabValue === 3 && (
          <CardContent>
            <Alert severity="info">
              Machine performance charts and OEE trends will be displayed here.
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Create Machine Dialog */}
      <Dialog open={machineDialog} onClose={() => setMachineDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Production Machine</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Machine Code"
              value={newMachine.machine_code}
              onChange={(e) => setNewMachine({ ...newMachine, machine_code: e.target.value })}
              fullWidth
            />
            <TextField
              label="Machine Name"
              value={newMachine.machine_name}
              onChange={(e) => setNewMachine({ ...newMachine, machine_name: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Machine Type</InputLabel>
              <Select
                value={newMachine.machine_type}
                onChange={(e) => setNewMachine({ ...newMachine, machine_type: e.target.value })}
                label="Machine Type"
              >
                <MenuItem value="cnc">CNC</MenuItem>
                <MenuItem value="lathe">Lathe</MenuItem>
                <MenuItem value="mill">Mill</MenuItem>
                <MenuItem value="drill">Drill</MenuItem>
                <MenuItem value="grinder">Grinder</MenuItem>
                <MenuItem value="welding">Welding</MenuItem>
                <MenuItem value="assembly">Assembly</MenuItem>
                <MenuItem value="testing">Testing</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Location"
              value={newMachine.location}
              onChange={(e) => setNewMachine({ ...newMachine, location: e.target.value })}
              fullWidth
            />
            <TextField
              label="Capacity per Hour"
              type="number"
              value={newMachine.capacity_per_hour}
              onChange={(e) => setNewMachine({ ...newMachine, capacity_per_hour: e.target.value })}
              fullWidth
            />
            <TextField
              label="OEE Target (%)"
              type="number"
              value={newMachine.oee_target}
              onChange={(e) => setNewMachine({ ...newMachine, oee_target: e.target.value })}
              fullWidth
              inputProps={{ min: 0, max: 100 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMachineDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateMachine} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Log Utilization Dialog */}
      <Dialog open={utilizationDialog} onClose={() => setUtilizationDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Log Machine Utilization</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Machine</InputLabel>
              <Select
                value={newUtilization.machine_id}
                onChange={(e) => setNewUtilization({ ...newUtilization, machine_id: e.target.value })}
                label="Machine"
              >
                {machines.map((machine) => (
                  <MenuItem key={machine.id} value={machine.id}>
                    {machine.machine_name} ({machine.machine_code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={newUtilization.status}
                onChange={(e) => setNewUtilization({ ...newUtilization, status: e.target.value })}
                label="Status"
              >
                <MenuItem value="running">Running</MenuItem>
                <MenuItem value="idle">Idle</MenuItem>
                <MenuItem value="setup">Setup</MenuItem>
                <MenuItem value="maintenance">Maintenance</MenuItem>
                <MenuItem value="breakdown">Breakdown</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Work Order ID (Optional)"
              type="number"
              value={newUtilization.work_order_id}
              onChange={(e) => setNewUtilization({ ...newUtilization, work_order_id: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Shift</InputLabel>
              <Select
                value={newUtilization.shift}
                onChange={(e) => setNewUtilization({ ...newUtilization, shift: e.target.value })}
                label="Shift"
              >
                <MenuItem value="Morning">Morning</MenuItem>
                <MenuItem value="Afternoon">Afternoon</MenuItem>
                <MenuItem value="Night">Night</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUtilizationDialog(false)}>Cancel</Button>
          <Button onClick={handleLogUtilization} variant="contained">
            Log
          </Button>
        </DialogActions>
      </Dialog>

      {/* Start Operation Dialog */}
      <Dialog open={operationDialog} onClose={() => setOperationDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Start Operation</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Work Order ID"
              type="number"
              value={newOperation.work_order_id}
              onChange={(e) => setNewOperation({ ...newOperation, work_order_id: e.target.value })}
              fullWidth
            />
            <TextField
              label="Operation Sequence"
              type="number"
              value={newOperation.operation_sequence}
              onChange={(e) => setNewOperation({ ...newOperation, operation_sequence: e.target.value })}
              fullWidth
            />
            <TextField
              label="Operation Name"
              value={newOperation.operation_name}
              onChange={(e) => setNewOperation({ ...newOperation, operation_name: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Machine</InputLabel>
              <Select
                value={newOperation.machine_id}
                onChange={(e) => setNewOperation({ ...newOperation, machine_id: e.target.value })}
                label="Machine"
              >
                {machines.filter(m => m.status === 'active').map((machine) => (
                  <MenuItem key={machine.id} value={machine.id}>
                    {machine.machine_name} ({machine.machine_code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Estimated Time (minutes)"
              type="number"
              value={newOperation.estimated_time_minutes}
              onChange={(e) => setNewOperation({ ...newOperation, estimated_time_minutes: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOperationDialog(false)}>Cancel</Button>
          <Button onClick={handleStartOperation} variant="contained" startIcon={<PlayArrow />}>
            Start
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ShopFloorDashboard;
