import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import {
  TrendingUp,
  Warning,
  CheckCircle,
  Refresh,
  Insights,
  Psychology,
  Assessment,
  Speed,
  Lightbulb,
  Error,
  NotificationsActive,
  AutoFixHigh
} from '@mui/icons-material';

interface AIDashboardProps {
  clientId: number;
}

interface AIInsight {
  id: number;
  model_name: string;
  insight_type: string;
  insight_category: string;
  title: string;
  description: string;
  confidence_score: number;
  severity_level: string;
  created_at: string;
  is_actionable: boolean;
  recommended_actions: string[];
}

interface AIRecommendation {
  id: number;
  insight_title: string;
  recommendation_type: string;
  priority_level: string;
  title: string;
  description: string;
  confidence_score: number;
  effort_level: string;
  status: string;
  estimated_cost_impact: number;
  estimated_time_savings_hours: number;
}

interface AIAlert {
  id: number;
  model_name: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  confidence_score: number;
  time_to_critical_hours: number;
  is_critical: boolean;
  requires_immediate_action: boolean;
  created_at: string;
}

interface ModelPerformance {
  model_name: string;
  model_type: string;
  model_category: string;
  accuracy_score: number;
  confidence_threshold: number;
  insights_generated: number;
  avg_insight_confidence: number;
  predictions_made: number;
}

interface DashboardData {
  summary: {
    total_insights: number;
    high_confidence_insights: number;
    critical_insights: number;
    avg_confidence: number;
    predictions: number;
    recommendations: number;
  };
  alerts: AIAlert[];
  recommendations: AIRecommendation[];
  modelPerformance: ModelPerformance[];
}

const AIDashboard: React.FC<AIDashboardProps> = ({ clientId }) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedCase, setSelectedCase] = useState<number>(1);
  const [currentTab, setCurrentTab] = useState(0);
  const [insightDialog, setInsightDialog] = useState<{
    open: boolean;
    insight: AIInsight | null;
  }>({ open: false, insight: null });

  useEffect(() => {
    fetchDashboardData();
  }, [clientId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ai-insights/dashboard/${clientId}`);
      const data = await response.json();
      if (data.success) {
        setDashboardData(data.data);
      }
    } catch (error) {
      console.error('Error fetching AI dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCaseInsights = async (caseId: number) => {
    try {
      const response = await fetch(`/api/ai-insights/cases/${caseId}/insights`);
      const data = await response.json();
      if (data.success) {
        setInsights(data.data);
      }
    } catch (error) {
      console.error('Error fetching case insights:', error);
    }
  };

  const generateInsights = async () => {
    try {
      setGenerating(true);
      const response = await fetch('/api/ai-insights/generate-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: selectedCase })
      });
      const data = await response.json();
      if (data.success) {
        await fetchDashboardData();
        await fetchCaseInsights(selectedCase);
      }
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setGenerating(false);
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

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <Error color="error" />;
      case 'high': return <Warning color="warning" />;
      case 'medium': return <Assessment color="info" />;
      case 'low': return <CheckCircle color="success" />;
      default: return <Insights />;
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'prediction': return <TrendingUp />;
      case 'recommendation': return <Lightbulb />;
      case 'anomaly': return <NotificationsActive />;
      case 'optimization': return <AutoFixHigh />;
      case 'warning': return <Warning />;
      default: return <Psychology />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography ml={2}>Loading AI Dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          <Psychology sx={{ mr: 1, verticalAlign: 'middle' }} />
          AI Insights Dashboard
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Case</InputLabel>
            <Select
              value={selectedCase}
              label="Case"
              onChange={(e) => {
                setSelectedCase(e.target.value as number);
                fetchCaseInsights(e.target.value as number);
              }}
            >
              <MenuItem value={1}>Case #1</MenuItem>
              <MenuItem value={2}>Case #2</MenuItem>
              <MenuItem value={3}>Case #3</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            color="primary"
            startIcon={generating ? <CircularProgress size={20} /> : <Psychology />}
            onClick={generateInsights}
            disabled={generating}
          >
            {generating ? 'Generating...' : 'Generate AI Insights'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchDashboardData}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      {dashboardData && (
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={2}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Insights
                </Typography>
                <Typography variant="h4">
                  {dashboardData.summary.total_insights}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={2}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  High Confidence
                </Typography>
                <Typography variant="h4" color="primary">
                  {dashboardData.summary.high_confidence_insights}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={2}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Critical Issues
                </Typography>
                <Typography variant="h4" color="error">
                  {dashboardData.summary.critical_insights}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={2}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Avg Confidence
                </Typography>
                <Typography variant="h4">
                  {Math.round(parseFloat(dashboardData.summary.avg_confidence || '0') * 100)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={2}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Predictions
                </Typography>
                <Typography variant="h4">
                  {dashboardData.summary.predictions}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={2}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Recommendations
                </Typography>
                <Typography variant="h4">
                  {dashboardData.summary.recommendations}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)} mb={2}>
        <Tab label="Insights" icon={<Insights />} />
        <Tab label="Alerts" icon={<NotificationsActive />} />
        <Tab label="Recommendations" icon={<Lightbulb />} />
        <Tab label="Model Performance" icon={<Speed />} />
      </Tabs>

      {/* Tab Content */}
      {currentTab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent AI Insights
            </Typography>
            {insights.length === 0 ? (
              <Alert severity="info">
                No insights generated yet. Click "Generate AI Insights" to analyze your project data.
              </Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell>Confidence</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {insights.map((insight) => (
                      <TableRow key={insight.id}>
                        <TableCell>
                          <Chip 
                            icon={getInsightIcon(insight.insight_type)}
                            label={insight.insight_type}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="subtitle2">
                            {insight.title}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {insight.description.substring(0, 100)}...
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <LinearProgress 
                              variant="determinate" 
                              value={insight.confidence_score * 100}
                              sx={{ width: 60, mr: 1 }}
                            />
                            <Typography variant="caption">
                              {Math.round(insight.confidence_score * 100)}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            icon={getSeverityIcon(insight.severity_level)}
                            label={insight.severity_level}
                            size="small"
                            color={getSeverityColor(insight.severity_level) as any}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={insight.insight_category}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="View Details">
                            <IconButton 
                              size="small"
                              onClick={() => setInsightDialog({ open: true, insight })}
                            >
                              <Assessment />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {currentTab === 1 && dashboardData && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Active AI Alerts
            </Typography>
            {dashboardData.alerts.length === 0 ? (
              <Alert severity="success">
                No active alerts. Your projects are running smoothly!
              </Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Severity</TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Confidence</TableCell>
                      <TableCell>Time Critical</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboardData.alerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <Chip 
                            icon={getSeverityIcon(alert.severity)}
                            label={alert.severity}
                            size="small"
                            color={getSeverityColor(alert.severity) as any}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="subtitle2">
                            {alert.title}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {alert.message.substring(0, 100)}...
                          </Typography>
                        </TableCell>
                        <TableCell>{alert.alert_type}</TableCell>
                        <TableCell>{Math.round(alert.confidence_score * 100)}%</TableCell>
                        <TableCell>
                          {alert.time_to_critical_hours ? `${alert.time_to_critical_hours}h` : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Button size="small" variant="outlined">
                            Acknowledge
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
      )}

      {currentTab === 2 && dashboardData && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              AI Recommendations
            </Typography>
            {dashboardData.recommendations.length === 0 ? (
              <Alert severity="info">
                No recommendations available. Generate insights to get AI-powered suggestions.
              </Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Priority</TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Effort</TableCell>
                      <TableCell>Confidence</TableCell>
                      <TableCell>Impact</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboardData.recommendations.map((recommendation) => (
                      <TableRow key={recommendation.id}>
                        <TableCell>
                          <Chip 
                            label={recommendation.priority_level}
                            size="small"
                            color={getSeverityColor(recommendation.priority_level) as any}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="subtitle2">
                            {recommendation.title}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {recommendation.description.substring(0, 100)}...
                          </Typography>
                        </TableCell>
                        <TableCell>{recommendation.recommendation_type}</TableCell>
                        <TableCell>{recommendation.effort_level}</TableCell>
                        <TableCell>{Math.round(recommendation.confidence_score * 100)}%</TableCell>
                        <TableCell>
                          {recommendation.estimated_cost_impact ? `$${recommendation.estimated_cost_impact}` : 'TBD'}
                        </TableCell>
                        <TableCell>
                          <Chip label={recommendation.status} size="small" />
                        </TableCell>
                        <TableCell>
                          <Button size="small" variant="outlined">
                            Implement
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
      )}

      {currentTab === 3 && dashboardData && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              AI Model Performance
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Model</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Insights Generated</TableCell>
                    <TableCell>Avg Confidence</TableCell>
                    <TableCell>Threshold</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dashboardData.modelPerformance.map((model, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="subtitle2">
                          {model.model_name}
                        </Typography>
                      </TableCell>
                      <TableCell>{model.model_type}</TableCell>
                      <TableCell>{model.model_category}</TableCell>
                      <TableCell>{model.insights_generated}</TableCell>
                      <TableCell>
                        {model.avg_insight_confidence ? 
                          `${Math.round(parseFloat(model.avg_insight_confidence.toString()) * 100)}%` : 
                          'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        {Math.round(parseFloat(model.confidence_threshold.toString()) * 100)}%
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={model.insights_generated > 0 ? 'Active' : 'Inactive'}
                          size="small"
                          color={model.insights_generated > 0 ? 'success' : 'default'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Insight Detail Dialog */}
      <Dialog
        open={insightDialog.open}
        onClose={() => setInsightDialog({ open: false, insight: null })}
        maxWidth="md"
        fullWidth
      >
        {insightDialog.insight && (
          <>
            <DialogTitle>
              {insightDialog.insight.title}
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" gutterBottom>
                {insightDialog.insight.description}
              </Typography>
              
              <Grid container spacing={2} mt={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Confidence Score
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={insightDialog.insight.confidence_score * 100}
                    sx={{ mt: 1 }}
                  />
                  <Typography variant="caption">
                    {Math.round(insightDialog.insight.confidence_score * 100)}%
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Severity Level
                  </Typography>
                  <Box mt={1}>
                    <Chip 
                      label={insightDialog.insight.severity_level}
                      color={getSeverityColor(insightDialog.insight.severity_level) as any}
                    />
                  </Box>
                </Grid>
              </Grid>

              {insightDialog.insight.recommended_actions && 
               insightDialog.insight.recommended_actions.length > 0 && (
                <Box mt={3}>
                  <Typography variant="h6" gutterBottom>
                    Recommended Actions
                  </Typography>
                  {insightDialog.insight.recommended_actions.map((action, index) => (
                    <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                      • {action}
                    </Typography>
                  ))}
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setInsightDialog({ open: false, insight: null })}>
                Close
              </Button>
              <Button variant="contained" color="primary">
                Take Action
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default AIDashboard;