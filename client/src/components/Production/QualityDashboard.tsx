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
  CheckCircle,
  Cancel,
  Warning,
  Assignment,
  BugReport,
  TrendingUp,
  Add,
  Edit,
  Visibility,
  Assessment,
  Download,
  Refresh,
} from '@mui/icons-material';

interface QualityCheckpoint {
  id: number;
  checkpoint_code: string;
  checkpoint_name: string;
  checkpoint_type: string;
  is_mandatory: number;
  sequence_order: number;
  is_active: number;
}

interface DefectType {
  id: number;
  defect_code: string;
  defect_name: string;
  category: 'critical' | 'major' | 'minor' | 'cosmetic';
  root_cause_category: string;
}

interface QualityInspection {
  id: number;
  work_order_number?: string;
  manufacturing_case_number?: string;
  product_name?: string;
  checkpoint_name?: string;
  inspector_name?: string;
  inspection_date: string;
  inspection_type: string;
  quantity_inspected: number;
  overall_result: 'pass' | 'fail' | 'conditional';
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  defects_found: number;
}

interface QualityMetrics {
  total_inspections: number;
  pending_inspections: number;
  passed_inspections: number;
  failed_inspections: number;
  pass_rate: number;
  total_defects: number;
  critical_defects: number;
  major_defects: number;
  minor_defects: number;
}

const QualityDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);

  // Data states
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null);
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [checkpoints, setCheckpoints] = useState<QualityCheckpoint[]>([]);
  const [defectTypes, setDefectTypes] = useState<DefectType[]>([]);

  // Dialog states
  const [inspectionDialog, setInspectionDialog] = useState(false);
  const [checkpointDialog, setCheckpointDialog] = useState(false);
  const [defectDialog, setDefectDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<QualityInspection | null>(null);

  // Form states
  const [newInspection, setNewInspection] = useState({
    work_order_id: '',
    checkpoint_id: '',
    quantity_inspected: '',
    inspector_notes: '',
  });

  const [newCheckpoint, setNewCheckpoint] = useState({
    checkpoint_code: '',
    checkpoint_name: '',
    checkpoint_type: 'incoming',
    description: '',
    is_mandatory: true,
    sequence_order: '',
  });

  const [newDefect, setNewDefect] = useState({
    defect_code: '',
    defect_name: '',
    category: 'major',
    root_cause_category: 'Process',
    description: '',
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchMetrics(),
        fetchInspections(),
        fetchCheckpoints(),
        fetchDefectTypes(),
      ]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/production/quality/metrics/dashboard', {
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

  const fetchInspections = async () => {
    try {
      const response = await fetch('/api/production/quality/inspections', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('vtria_token')}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        setInspections(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching inspections:', error);
    }
  };

  const fetchCheckpoints = async () => {
    try {
      const response = await fetch('/api/production/quality/checkpoints', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('vtria_token')}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        setCheckpoints(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching checkpoints:', error);
    }
  };

  const fetchDefectTypes = async () => {
    try {
      const response = await fetch('/api/production/quality/defect-types', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('vtria_token')}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        setDefectTypes(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching defect types:', error);
    }
  };

  const handleCreateInspection = async () => {
    try {
      const response = await fetch('/api/production/quality/inspections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('vtria_token')}`,
        },
        body: JSON.stringify({
          ...newInspection,
          quantity_inspected: parseInt(newInspection.quantity_inspected),
          checkpoint_id: parseInt(newInspection.checkpoint_id),
          work_order_id: parseInt(newInspection.work_order_id),
        }),
      });

      if (response.ok) {
        setInspectionDialog(false);
        setNewInspection({
          work_order_id: '',
          checkpoint_id: '',
          quantity_inspected: '',
          inspector_notes: '',
        });
        fetchInspections();
        fetchMetrics();
      }
    } catch (error) {
      console.error('Error creating inspection:', error);
    }
  };

  const handleCreateCheckpoint = async () => {
    try {
      const response = await fetch('/api/production/quality/checkpoints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('vtria_token')}`,
        },
        body: JSON.stringify({
          ...newCheckpoint,
          sequence_order: parseInt(newCheckpoint.sequence_order),
        }),
      });

      if (response.ok) {
        setCheckpointDialog(false);
        setNewCheckpoint({
          checkpoint_code: '',
          checkpoint_name: '',
          checkpoint_type: 'incoming',
          description: '',
          is_mandatory: true,
          sequence_order: '',
        });
        fetchCheckpoints();
      }
    } catch (error) {
      console.error('Error creating checkpoint:', error);
    }
  };

  const handleCreateDefectType = async () => {
    try {
      const response = await fetch('/api/production/quality/defect-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('vtria_token')}`,
        },
        body: JSON.stringify(newDefect),
      });

      if (response.ok) {
        setDefectDialog(false);
        setNewDefect({
          defect_code: '',
          defect_name: '',
          category: 'major',
          root_cause_category: 'Process',
          description: '',
        });
        fetchDefectTypes();
      }
    } catch (error) {
      console.error('Error creating defect type:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'submitted': return 'warning';
      case 'draft': return 'default';
      default: return 'default';
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'pass': return 'success';
      case 'fail': return 'error';
      case 'conditional': return 'warning';
      default: return 'default';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'critical': return 'error';
      case 'major': return 'warning';
      case 'minor': return 'info';
      case 'cosmetic': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Quality Control Dashboard
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
            onClick={() => setInspectionDialog(true)}
          >
            New Inspection
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
                      Total Inspections
                    </Typography>
                    <Typography variant="h4">
                      {metrics.total_inspections}
                    </Typography>
                  </Box>
                  <Assignment sx={{ fontSize: 48, color: 'primary.main', opacity: 0.3 }} />
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
                      Pass Rate
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {metrics?.pass_rate?.toFixed(1) ?? '0.0'}%
                    </Typography>
                  </Box>
                  <CheckCircle sx={{ fontSize: 48, color: 'success.main', opacity: 0.3 }} />
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
                      Total Defects
                    </Typography>
                    <Typography variant="h4">
                      {metrics.total_defects}
                    </Typography>
                  </Box>
                  <BugReport sx={{ fontSize: 48, color: 'warning.main', opacity: 0.3 }} />
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
                      Critical Defects
                    </Typography>
                    <Typography variant="h4" color="error.main">
                      {metrics.critical_defects}
                    </Typography>
                  </Box>
                  <Warning sx={{ fontSize: 48, color: 'error.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Card>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Inspections" />
          <Tab label="Quality Checkpoints" />
          <Tab label="Defect Types" />
          <Tab label="Analytics" />
        </Tabs>

        {/* Inspections Tab */}
        {tabValue === 0 && (
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Work Order</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell>Checkpoint</TableCell>
                    <TableCell>Inspector</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Qty</TableCell>
                    <TableCell>Result</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Defects</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inspections.map((inspection) => (
                    <TableRow key={inspection.id}>
                      <TableCell>{inspection.id}</TableCell>
                      <TableCell>{inspection.work_order_number || '-'}</TableCell>
                      <TableCell>{inspection.product_name || '-'}</TableCell>
                      <TableCell>{inspection.checkpoint_name || '-'}</TableCell>
                      <TableCell>{inspection.inspector_name || '-'}</TableCell>
                      <TableCell>
                        {new Date(inspection.inspection_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{inspection.quantity_inspected}</TableCell>
                      <TableCell>
                        <Chip
                          label={inspection.overall_result}
                          color={getResultColor(inspection.overall_result)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={inspection.status}
                          color={getStatusColor(inspection.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {inspection.defects_found > 0 && (
                          <Chip
                            label={inspection.defects_found}
                            color="error"
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedInspection(inspection);
                            setViewDialog(true);
                          }}
                        >
                          <Visibility />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}

        {/* Checkpoints Tab */}
        {tabValue === 1 && (
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setCheckpointDialog(true)}
              >
                Add Checkpoint
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Sequence</TableCell>
                    <TableCell>Mandatory</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {checkpoints.map((checkpoint) => (
                    <TableRow key={checkpoint.id}>
                      <TableCell>{checkpoint.checkpoint_code}</TableCell>
                      <TableCell>{checkpoint.checkpoint_name}</TableCell>
                      <TableCell>
                        <Chip label={checkpoint.checkpoint_type} size="small" />
                      </TableCell>
                      <TableCell>{checkpoint.sequence_order}</TableCell>
                      <TableCell>
                        {checkpoint.is_mandatory ? (
                          <CheckCircle color="success" />
                        ) : (
                          <Cancel color="disabled" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={checkpoint.is_active ? 'Active' : 'Inactive'}
                          color={checkpoint.is_active ? 'success' : 'default'}
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

        {/* Defect Types Tab */}
        {tabValue === 2 && (
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setDefectDialog(true)}
              >
                Add Defect Type
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Root Cause</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {defectTypes.map((defect) => (
                    <TableRow key={defect.id}>
                      <TableCell>{defect.defect_code}</TableCell>
                      <TableCell>{defect.defect_name}</TableCell>
                      <TableCell>
                        <Chip
                          label={defect.category}
                          color={getCategoryColor(defect.category)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{defect.root_cause_category}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}

        {/* Analytics Tab */}
        {tabValue === 3 && (
          <CardContent>
            <Alert severity="info">
              Analytics charts and trends will be displayed here. Integration with charting library needed.
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Create Inspection Dialog */}
      <Dialog open={inspectionDialog} onClose={() => setInspectionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Quality Inspection</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Work Order ID"
              type="number"
              value={newInspection.work_order_id}
              onChange={(e) => setNewInspection({ ...newInspection, work_order_id: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Checkpoint</InputLabel>
              <Select
                value={newInspection.checkpoint_id}
                onChange={(e) => setNewInspection({ ...newInspection, checkpoint_id: e.target.value })}
                label="Checkpoint"
              >
                {checkpoints.map((cp) => (
                  <MenuItem key={cp.id} value={cp.id}>
                    {cp.checkpoint_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Quantity Inspected"
              type="number"
              value={newInspection.quantity_inspected}
              onChange={(e) => setNewInspection({ ...newInspection, quantity_inspected: e.target.value })}
              fullWidth
            />
            <TextField
              label="Inspector Notes"
              multiline
              rows={3}
              value={newInspection.inspector_notes}
              onChange={(e) => setNewInspection({ ...newInspection, inspector_notes: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInspectionDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateInspection} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Checkpoint Dialog */}
      <Dialog open={checkpointDialog} onClose={() => setCheckpointDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Quality Checkpoint</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Checkpoint Code"
              value={newCheckpoint.checkpoint_code}
              onChange={(e) => setNewCheckpoint({ ...newCheckpoint, checkpoint_code: e.target.value })}
              fullWidth
            />
            <TextField
              label="Checkpoint Name"
              value={newCheckpoint.checkpoint_name}
              onChange={(e) => setNewCheckpoint({ ...newCheckpoint, checkpoint_name: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={newCheckpoint.checkpoint_type}
                onChange={(e) => setNewCheckpoint({ ...newCheckpoint, checkpoint_type: e.target.value })}
                label="Type"
              >
                <MenuItem value="incoming">Incoming</MenuItem>
                <MenuItem value="in_process">In Process</MenuItem>
                <MenuItem value="final">Final</MenuItem>
                <MenuItem value="pre_delivery">Pre Delivery</MenuItem>
                <MenuItem value="first_article">First Article</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Sequence Order"
              type="number"
              value={newCheckpoint.sequence_order}
              onChange={(e) => setNewCheckpoint({ ...newCheckpoint, sequence_order: e.target.value })}
              fullWidth
            />
            <TextField
              label="Description"
              multiline
              rows={2}
              value={newCheckpoint.description}
              onChange={(e) => setNewCheckpoint({ ...newCheckpoint, description: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckpointDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateCheckpoint} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Defect Type Dialog */}
      <Dialog open={defectDialog} onClose={() => setDefectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Defect Type</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Defect Code"
              value={newDefect.defect_code}
              onChange={(e) => setNewDefect({ ...newDefect, defect_code: e.target.value })}
              fullWidth
            />
            <TextField
              label="Defect Name"
              value={newDefect.defect_name}
              onChange={(e) => setNewDefect({ ...newDefect, defect_name: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={newDefect.category}
                onChange={(e) => setNewDefect({ ...newDefect, category: e.target.value })}
                label="Category"
              >
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="major">Major</MenuItem>
                <MenuItem value="minor">Minor</MenuItem>
                <MenuItem value="cosmetic">Cosmetic</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Root Cause Category</InputLabel>
              <Select
                value={newDefect.root_cause_category}
                onChange={(e) => setNewDefect({ ...newDefect, root_cause_category: e.target.value })}
                label="Root Cause Category"
              >
                <MenuItem value="Material">Material</MenuItem>
                <MenuItem value="Process">Process</MenuItem>
                <MenuItem value="Equipment">Equipment</MenuItem>
                <MenuItem value="Human">Human</MenuItem>
                <MenuItem value="Environment">Environment</MenuItem>
                <MenuItem value="Design">Design</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Description"
              multiline
              rows={2}
              value={newDefect.description}
              onChange={(e) => setNewDefect({ ...newDefect, description: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDefectDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateDefectType} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QualityDashboard;
