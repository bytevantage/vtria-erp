import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Grid,
  Divider,
  Alert,
  Tooltip,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  DragIndicator as DragIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  MoreVert as MoreVertIcon,
  Warning as WarningIcon
} from '@mui/material/icons';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const EstimationSectionManager = ({ 
  estimationId, 
  sections = [], 
  onSectionsChange,
  readonly = false 
}) => {
  const [localSections, setLocalSections] = useState(sections);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [sectionForm, setSectionForm] = useState({
    heading: '',
    parent_id: null,
    sort_order: 0
  });
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);

  useEffect(() => {
    setLocalSections(sections);
  }, [sections]);

  const handleAddSection = (parentId = null) => {
    setSectionForm({
      heading: '',
      parent_id: parentId,
      sort_order: getNextSortOrder(parentId)
    });
    setEditingSection(null);
    setOpenDialog(true);
  };

  const handleEditSection = (section) => {
    setSectionForm({
      heading: section.heading,
      parent_id: section.parent_id,
      sort_order: section.sort_order
    });
    setEditingSection(section);
    setOpenDialog(true);
  };

  const handleSaveSection = async () => {
    try {
      const sectionData = {
        ...sectionForm,
        estimation_id: estimationId
      };

      let updatedSections;
      if (editingSection) {
        // Update existing section
        updatedSections = localSections.map(section =>
          section.id === editingSection.id
            ? { ...section, ...sectionData }
            : section
        );
      } else {
        // Add new section
        const newSection = {
          id: Date.now(), // Temporary ID
          ...sectionData,
          items: []
        };
        updatedSections = [...localSections, newSection];
      }

      setLocalSections(updatedSections);
      onSectionsChange(updatedSections);
      setOpenDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error saving section:', error);
    }
  };

  const handleDeleteSection = async (sectionId) => {
    if (window.confirm('Are you sure you want to delete this section and all its items?')) {
      const updatedSections = localSections.filter(section => 
        section.id !== sectionId && section.parent_id !== sectionId
      );
      setLocalSections(updatedSections);
      onSectionsChange(updatedSections);
    }
  };

  const resetForm = () => {
    setSectionForm({
      heading: '',
      parent_id: null,
      sort_order: 0
    });
    setEditingSection(null);
  };

  const getNextSortOrder = (parentId) => {
    const siblingsSections = localSections.filter(s => s.parent_id === parentId);
    return siblingsSections.length > 0 
      ? Math.max(...siblingsSections.map(s => s.sort_order)) + 1 
      : 1;
  };

  const getChildSections = (parentId) => {
    return localSections
      .filter(section => section.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order);
  };

  const getRootSections = () => {
    return localSections
      .filter(section => !section.parent_id)
      .sort((a, b) => a.sort_order - b.sort_order);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination } = result;
    if (source.index === destination.index) return;

    // Reorder sections
    const updatedSections = [...localSections];
    const [removed] = updatedSections.splice(source.index, 1);
    updatedSections.splice(destination.index, 0, removed);

    // Update sort orders
    updatedSections.forEach((section, index) => {
      section.sort_order = index + 1;
    });

    setLocalSections(updatedSections);
    onSectionsChange(updatedSections);
  };

  const toggleExpanded = (sectionId) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleMenuClick = (event, section) => {
    setAnchorEl(event.currentTarget);
    setSelectedSection(section);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedSection(null);
  };

  const getSectionItemCount = (sectionId) => {
    const section = localSections.find(s => s.id === sectionId);
    return section?.items?.length || 0;
  };

  const getSectionTotal = (sectionId) => {
    const section = localSections.find(s => s.id === sectionId);
    if (!section?.items) return 0;
    
    return section.items.reduce((total, item) => {
      return total + (item.final_price || 0);
    }, 0);
  };

  const renderSection = (section, level = 0) => {
    const childSections = getChildSections(section.id);
    const isExpanded = expandedSections.has(section.id);
    const itemCount = getSectionItemCount(section.id);
    const sectionTotal = getSectionTotal(section.id);

    return (
      <Box key={section.id} sx={{ ml: level * 2 }}>
        <Paper 
          elevation={1} 
          sx={{ 
            mb: 1, 
            border: level === 0 ? '2px solid #e0e0e0' : '1px solid #f0f0f0',
            backgroundColor: level === 0 ? '#fafafa' : 'white'
          }}
        >
          <Box display="flex" alignItems="center" p={2}>
            <IconButton
              size="small"
              onClick={() => toggleExpanded(section.id)}
              sx={{ mr: 1 }}
            >
              {isExpanded ? <FolderOpenIcon /> : <FolderIcon />}
            </IconButton>
            
            <Box flex={1}>
              <Typography 
                variant={level === 0 ? "h6" : "subtitle1"} 
                fontWeight={level === 0 ? "bold" : "medium"}
              >
                {section.heading}
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                <Chip 
                  size="small" 
                  label={`${itemCount} items`} 
                  color={itemCount > 0 ? "primary" : "default"}
                />
                {sectionTotal > 0 && (
                  <Chip 
                    size="small" 
                    label={`₹${sectionTotal.toLocaleString()}`} 
                    color="success"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>

            {!readonly && (
              <Box>
                <IconButton
                  size="small"
                  onClick={(e) => handleMenuClick(e, section)}
                >
                  <MoreVertIcon />
                </IconButton>
              </Box>
            )}
          </Box>

          {isExpanded && (
            <Box sx={{ borderTop: '1px solid #e0e0e0', p: 2, pt: 1 }}>
              {/* Child sections */}
              {childSections.map(childSection => renderSection(childSection, level + 1))}
              
              {/* Add subsection button */}
              {!readonly && (
                <Box mt={1}>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => handleAddSection(section.id)}
                    variant="outlined"
                    color="primary"
                  >
                    Add Subsection
                  </Button>
                </Box>
              )}
              
              {/* Section items would be rendered here */}
              {section.items && section.items.length > 0 && (
                <Box mt={2}>
                  <Typography variant="caption" color="text.secondary">
                    Items in this section will be displayed here
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Paper>
      </Box>
    );
  };

  return (
    <Box>
      <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
        <Typography variant="h6">Estimation Sections</Typography>
        {!readonly && (
          <Button
            startIcon={<AddIcon />}
            onClick={() => handleAddSection()}
            variant="contained"
            color="primary"
          >
            Add Main Section
          </Button>
        )}
      </Box>

      {localSections.length === 0 ? (
        <Alert severity="info">
          No sections created yet. Add your first main section to get started.
        </Alert>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="sections">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                {getRootSections().map((section, index) => (
                  <Draggable
                    key={section.id}
                    draggableId={section.id.toString()}
                    index={index}
                    isDragDisabled={readonly}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        {renderSection(section)}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          handleEditSection(selectedSection);
          handleMenuClose();
        }}>
          <EditIcon sx={{ mr: 1 }} />
          Edit Section
        </MenuItem>
        <MenuItem onClick={() => {
          handleAddSection(selectedSection.id);
          handleMenuClose();
        }}>
          <AddIcon sx={{ mr: 1 }} />
          Add Subsection
        </MenuItem>
        <MenuItem 
          onClick={() => {
            handleDeleteSection(selectedSection.id);
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Delete Section
        </MenuItem>
      </Menu>

      {/* Add/Edit Section Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingSection ? 'Edit Section' : 'Add New Section'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Section Heading"
            fullWidth
            variant="outlined"
            value={sectionForm.heading}
            onChange={(e) => setSectionForm({
              ...sectionForm,
              heading: e.target.value
            })}
            placeholder="e.g., Main Panel, Generator, UPS, Incoming, Outgoing"
          />
          
          {sectionForm.parent_id && (
            <Alert severity="info" sx={{ mt: 2 }}>
              This will be created as a subsection under the selected parent section.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveSection}
            variant="contained"
            disabled={!sectionForm.heading.trim()}
          >
            {editingSection ? 'Update' : 'Add'} Section
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EstimationSectionManager;
