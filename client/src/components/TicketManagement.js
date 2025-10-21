import React, { useState, useEffect } from 'react';
import {
  Box,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  Fab,
  InputAdornment,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { api } from '../utils/api';

const TicketManagement = () => {
  const [tickets, setTickets] = useState([]);
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    queue_id: '',
    search: ''
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [activeTab, setActiveTab] = useState(0);

  // Form states
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    customer_id: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    product_id: '',
    serial_number: '',
    category: 'support',
    issue_type: '',
    priority: 'medium',
    source: 'direct',
    is_warranty_claim: false
  });

  const [users, setUsers] = useState([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedTicketForAction, setSelectedTicketForAction] = useState(null);
  const [actionForm, setActionForm] = useState({
    assigned_to: '',
    queue_id: '',
    notes: '',
    resolution_summary: '',
    customer_satisfaction: '',
    closure_notes: ''
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [ticketsRes, queuesRes, customersRes, productsRes, usersRes] = await Promise.all([
        api.get('/api/tickets'),
        api.get('/api/tickets/queues/all'),
        api.get('/api/clients'),
        api.get('/api/products'),
        api.get('/api/users')
      ]);

      if (ticketsRes.success) setTickets(ticketsRes.data.data || []);
      if (queuesRes.success) setQueues(queuesRes.data || []);
      if (customersRes.success) setCustomers(customersRes.data || []);
      if (productsRes.success) setProducts(productsRes.data || []);
      if (usersRes.success) setUsers(usersRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      showSnackbar('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async () => {
    try {
      const response = await api.post('/api/tickets', newTicket);
      if (response.success) {
        showSnackbar('Ticket created successfully', 'success');
        setCreateDialogOpen(false);
        resetNewTicketForm();
        loadInitialData();
      } else {
        showSnackbar(response.message || 'Error creating ticket', 'error');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      showSnackbar('Error creating ticket', 'error');
    }
  };

  const handleUpdateStatus = async (ticketId, newStatus, notes = '') => {
    try {
      const response = await api.put(`/api/tickets/${ticketId}/status`, {
        status: newStatus,
        notes
      });
      if (response.success) {
        showSnackbar('Ticket status updated', 'success');
        loadInitialData();
      } else {
        showSnackbar(response.message || 'Error updating status', 'error');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showSnackbar('Error updating status', 'error');
    }
  };

  const handleAssignTicket = async (ticketId, assignedTo) => {
    try {
      const response = await api.put(`/api/tickets/${ticketId}/assign`, {
        assigned_to: assignedTo
      });
      if (response.success) {
        showSnackbar('Ticket assigned successfully', 'success');
        loadInitialData();
      } else {
        showSnackbar(response.message || 'Error assigning ticket', 'error');
      }
    } catch (error) {
      console.error('Error assigning ticket:', error);
      showSnackbar('Error assigning ticket', 'error');
    }
  };

  const handleSelfAssign = async (ticketId) => {
    // Get current user ID from localStorage or context
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (!currentUser.id) {
      showSnackbar('User not authenticated', 'error');
      return;
    }

    await handleAssignTicket(ticketId, currentUser.id);
  };

  const handleMoveToQueue = async () => {
    try {
      const response = await api.put(`/api/tickets/${selectedTicketForAction.id}/queue`, {
        queue_id: actionForm.queue_id,
        notes: actionForm.notes
      });
      if (response.success) {
        showSnackbar(`Ticket moved to ${response.data.queue_name}`, 'success');
        setMoveDialogOpen(false);
        resetActionForm();
        loadInitialData();
      } else {
        showSnackbar(response.message || 'Error moving ticket', 'error');
      }
    } catch (error) {
      console.error('Error moving ticket:', error);
      showSnackbar('Error moving ticket', 'error');
    }
  };

  const handleRejectTicket = async () => {
    if (!actionForm.notes || actionForm.notes.trim().length === 0) {
      showSnackbar('Rejection reason is mandatory', 'error');
      return;
    }

    try {
      const response = await api.post(`/api/tickets/${selectedTicketForAction.id}/reject`, {
        rejection_reason: actionForm.notes,
        rejection_notes: actionForm.resolution_summary || ''
      });
      if (response.success) {
        showSnackbar(`Ticket rejected and moved back to ${response.data.to_queue}`, 'warning');
        setRejectDialogOpen(false);
        resetActionForm();
        loadInitialData();
      } else {
        showSnackbar(response.message || 'Error rejecting ticket', 'error');
      }
    } catch (error) {
      console.error('Error rejecting ticket:', error);
      showSnackbar('Error rejecting ticket', 'error');
    }
  };

  const resetActionForm = () => {
    setActionForm({
      assigned_to: '',
      queue_id: '',
      notes: '',
      resolution_summary: '',
      customer_satisfaction: '',
      closure_notes: ''
    });
    setSelectedTicketForAction(null);
  };

  const resetNewTicketForm = () => {
    setNewTicket({
      title: '',
      description: '',
      customer_id: '',
      contact_person: '',
      contact_email: '',
      contact_phone: '',
      product_id: '',
      serial_number: '',
      category: 'support',
      issue_type: '',
      priority: 'medium',
      source: 'direct',
      is_warranty_claim: false
    });
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'primary';
      case 'in_progress': return 'warning';
      case 'resolved': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getAgeColor = (ageColor) => {
    switch (ageColor) {
      case 'green': return 'success';
      case 'yellow': return 'warning';
      case 'red': return 'error';
      default: return 'default';
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesStatus = !filters.status || ticket.status === filters.status;
    const matchesPriority = !filters.priority || ticket.priority === filters.priority;
    const matchesQueue = !filters.queue_id || ticket.queue_id === parseInt(filters.queue_id);
    const matchesSearch = !filters.search ||
      ticket.title?.toLowerCase().includes(filters.search.toLowerCase()) ||
      ticket.ticket_number?.toLowerCase().includes(filters.search.toLowerCase()) ||
      ticket.customer_name?.toLowerCase().includes(filters.search.toLowerCase());

    return matchesStatus && matchesPriority && matchesQueue && matchesSearch;
  });

  const getQueueTickets = (queueType) => {
    return filteredTickets.filter(ticket => {
      const queue = queues.find(q => q.id === ticket.queue_id);
      return queue?.queue_type === queueType;
    });
  };

  const renderTicketTable = (ticketList) => (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Ticket #</TableCell>
            <TableCell>Title</TableCell>
            <TableCell>Customer</TableCell>
            <TableCell>Priority</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Age</TableCell>
            <TableCell>Assigned To</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {ticketList.map((ticket) => (
            <TableRow key={ticket.id} hover>
              <TableCell>
                <Typography variant="body2" fontWeight="bold">
                  {ticket.ticket_number}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ticket.title}
                </Typography>
              </TableCell>
              <TableCell>{ticket.customer_name}</TableCell>
              <TableCell>
                <Chip
                  label={ticket.priority}
                  color={getPriorityColor(ticket.priority)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={ticket.status.replace('_', ' ')}
                  color={getStatusColor(ticket.status)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={`${ticket.hours_open}h`}
                  color={getAgeColor(ticket.age_color)}
                  size="small"
                />
              </TableCell>
              <TableCell>{ticket.assigned_to_name || 'Unassigned'}</TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setDetailDialogOpen(true);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>

                  {ticket.status !== 'closed' && (
                    <>
                      {!ticket.assigned_to && (
                        <Tooltip title="Assign to Me">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleSelfAssign(ticket.id)}
                          >
                            <AssignmentIcon />
                          </IconButton>
                        </Tooltip>
                      )}

                      <Tooltip title="Assign to User">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedTicketForAction(ticket);
                            setAssignDialogOpen(true);
                          }}
                        >
                          <AssignmentIcon />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Move to Queue">
                        <IconButton
                          size="small"
                          color="secondary"
                          onClick={() => {
                            setSelectedTicketForAction(ticket);
                            setMoveDialogOpen(true);
                          }}
                        >
                          <ScheduleIcon />
                        </IconButton>
                      </Tooltip>

                      {/* Reject button - only show for queues that can be rejected */}
                      {ticket.queue_name && !ticket.queue_name.toLowerCase().includes('support') && (
                        <Tooltip title="Reject (Move Back)">
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => {
                              setSelectedTicketForAction(ticket);
                              setRejectDialogOpen(true);
                            }}
                          >
                            <ErrorIcon />
                          </IconButton>
                        </Tooltip>
                      )}

                      {ticket.queue_name?.toLowerCase().includes('closure') && (
                        <Tooltip title="Close Ticket">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => {
                              setSelectedTicketForAction(ticket);
                              setCloseDialogOpen(true);
                            }}
                          >
                            <CheckCircleIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Ticket Management System
      </Typography>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Search"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="open">Open</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="resolved">Resolved</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Queue</InputLabel>
                <Select
                  value={filters.queue_id}
                  onChange={(e) => setFilters({ ...filters, queue_id: e.target.value })}
                >
                  <MenuItem value="">All Queues</MenuItem>
                  {queues.map((queue) => (
                    <MenuItem key={queue.id} value={queue.id}>
                      {queue.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadInitialData}
                fullWidth
              >
                Refresh
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Queue Tabs */}
      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
        <Tab label={`All Tickets (${filteredTickets.length})`} />
        <Tab label={`Support Queue (${getQueueTickets('support').length})`} />
        <Tab label={`Diagnosis Queue (${getQueueTickets('diagnosis').length})`} />
        <Tab label={`Resolution Queue (${getQueueTickets('resolution').length})`} />
        <Tab label={`Closure Queue (${getQueueTickets('closure').length})`} />
      </Tabs>

      {/* Ticket Tables */}
      {activeTab === 0 && renderTicketTable(filteredTickets)}
      {activeTab === 1 && renderTicketTable(getQueueTickets('support'))}
      {activeTab === 2 && renderTicketTable(getQueueTickets('diagnosis'))}
      {activeTab === 3 && renderTicketTable(getQueueTickets('resolution'))}
      {activeTab === 4 && renderTicketTable(getQueueTickets('closure'))}

      {/* Create Ticket FAB */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setCreateDialogOpen(true)}
      >
        <AddIcon />
      </Fab>

      {/* Create Ticket Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Ticket</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={newTicket.title}
                onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={newTicket.description}
                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Customer</InputLabel>
                <Select
                  value={newTicket.customer_id}
                  onChange={(e) => setNewTicket({ ...newTicket, customer_id: e.target.value })}
                  required
                >
                  {customers.map((customer) => (
                    <MenuItem key={customer.id} value={customer.id}>
                      {customer.company_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Product</InputLabel>
                <Select
                  value={newTicket.product_id}
                  onChange={(e) => setNewTicket({ ...newTicket, product_id: e.target.value })}
                >
                  <MenuItem value="">None</MenuItem>
                  {products.map((product) => (
                    <MenuItem key={product.id} value={product.id}>
                      {product.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Serial Number"
                value={newTicket.serial_number}
                onChange={(e) => setNewTicket({ ...newTicket, serial_number: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={newTicket.category}
                  onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                >
                  <MenuItem value="support">Support</MenuItem>
                  <MenuItem value="maintenance">Maintenance</MenuItem>
                  <MenuItem value="warranty">Warranty</MenuItem>
                  <MenuItem value="installation">Installation</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Source</InputLabel>
                <Select
                  value={newTicket.source}
                  onChange={(e) => setNewTicket({ ...newTicket, source: e.target.value })}
                >
                  <MenuItem value="direct">Direct</MenuItem>
                  <MenuItem value="email">Email</MenuItem>
                  <MenuItem value="phone">Phone</MenuItem>
                  <MenuItem value="whatsapp">WhatsApp</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateTicket} variant="contained">Create Ticket</Button>
        </DialogActions>
      </Dialog>

      {/* Assign Ticket Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Ticket</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Assign ticket {selectedTicketForAction?.ticket_number} to a user
          </Typography>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Assign To</InputLabel>
            <Select
              value={actionForm.assigned_to}
              onChange={(e) => setActionForm({ ...actionForm, assigned_to: e.target.value })}
            >
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.full_name} ({user.user_role})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Assignment Notes (Optional)"
            value={actionForm.notes}
            onChange={(e) => setActionForm({ ...actionForm, notes: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              handleAssignTicket(selectedTicketForAction.id, actionForm.assigned_to);
              setAssignDialogOpen(false);
              resetActionForm();
            }}
            variant="contained"
            disabled={!actionForm.assigned_to}
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      {/* Move to Queue Dialog */}
      <Dialog open={moveDialogOpen} onClose={() => setMoveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Move Ticket to Queue</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Move ticket {selectedTicketForAction?.ticket_number} to a different queue
          </Typography>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Target Queue</InputLabel>
            <Select
              value={actionForm.queue_id}
              onChange={(e) => setActionForm({ ...actionForm, queue_id: e.target.value })}
            >
              {queues.map((queue) => (
                <MenuItem key={queue.id} value={queue.id}>
                  {queue.name} ({queue.queue_type})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Movement Notes"
            value={actionForm.notes}
            onChange={(e) => setActionForm({ ...actionForm, notes: e.target.value })}
            required
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMoveDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleMoveToQueue}
            variant="contained"
            disabled={!actionForm.queue_id || !actionForm.notes.trim()}
          >
            Move
          </Button>
        </DialogActions>
      </Dialog>

      {/* Close Ticket Dialog */}
      <Dialog open={closeDialogOpen} onClose={() => setCloseDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Close Ticket</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Close ticket {selectedTicketForAction?.ticket_number}
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Resolution Summary"
                value={actionForm.resolution_summary}
                onChange={(e) => setActionForm({ ...actionForm, resolution_summary: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Customer Satisfaction</InputLabel>
                <Select
                  value={actionForm.customer_satisfaction}
                  onChange={(e) => setActionForm({ ...actionForm, customer_satisfaction: e.target.value })}
                >
                  <MenuItem value="very_satisfied">Very Satisfied</MenuItem>
                  <MenuItem value="satisfied">Satisfied</MenuItem>
                  <MenuItem value="neutral">Neutral</MenuItem>
                  <MenuItem value="dissatisfied">Dissatisfied</MenuItem>
                  <MenuItem value="very_dissatisfied">Very Dissatisfied</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Closure Notes (Required)"
                value={actionForm.closure_notes}
                onChange={(e) => setActionForm({ ...actionForm, closure_notes: e.target.value })}
                required
                error={!actionForm.closure_notes || actionForm.closure_notes.trim().length === 0}
                helperText="Closure notes are mandatory when closing a ticket"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCloseTicket}
            variant="contained"
            disabled={!actionForm.closure_notes || actionForm.closure_notes.trim().length === 0}
          >
            Close Ticket
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Ticket Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Ticket</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Reject ticket {selectedTicketForAction?.ticket_number} and move it back to the previous queue
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action will move the ticket back one queue in the workflow and cannot be undone.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Rejection Reason (Required)"
            value={actionForm.notes}
            onChange={(e) => setActionForm({ ...actionForm, notes: e.target.value })}
            required
            error={!actionForm.notes || actionForm.notes.trim().length === 0}
            helperText="Please provide a reason for rejecting this ticket"
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Additional Notes (Optional)"
            value={actionForm.resolution_summary}
            onChange={(e) => setActionForm({ ...actionForm, resolution_summary: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleRejectTicket}
            variant="contained"
            color="warning"
            disabled={!actionForm.notes || actionForm.notes.trim().length === 0}
          >
            Reject Ticket
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TicketManagement;