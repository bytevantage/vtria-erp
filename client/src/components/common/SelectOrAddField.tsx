import React, { useState, useCallback } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Box,
  Typography,
  FormHelperText,
  Autocomplete,
  Chip
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';

interface Option {
  id: string | number;
  label: string;
  value?: string | number;
}

interface SelectOrAddFieldProps {
  label: string;
  name: string;
  value: string | number;
  onChange: (name: string, value: string | number) => void;
  options: Option[];
  onAddNew?: (newValue: string) => Promise<Option> | Option;
  error?: string;
  helperText?: string;
  required?: boolean;
  placeholder?: string;
  freeSolo?: boolean;
  allowMultiple?: boolean;
  fullWidth?: boolean;
}

const SelectOrAddField: React.FC<SelectOrAddFieldProps> = ({
  label,
  name,
  value,
  onChange,
  options = [],
  onAddNew,
  error,
  helperText,
  required = false,
  placeholder = "Select or type to add new...",
  freeSolo = true,
  allowMultiple = false,
  fullWidth = true
}) => {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Convert options to format expected by Autocomplete
  const autocompleteOptions = options.map(option => ({
    id: option.id,
    label: option.label,
    value: option.value || option.id
  }));

  // Find current selected option
  const currentOption = autocompleteOptions.find(option =>
    option.value === value || option.id === value
  );

  const handleAutocompleteChange = useCallback((event: React.SyntheticEvent, newValue: Option | string | null) => {
    if (typeof newValue === 'string') {
      // User typed a new value
      if (onAddNew) {
        handleAddNew(newValue);
      } else {
        onChange(name, newValue);
      }
    } else if (newValue && typeof newValue === 'object') {
      // User selected an existing option
      onChange(name, newValue.value || newValue.id);
    } else {
      // Clear selection
      onChange(name, '');
    }
  }, [name, onChange, onAddNew]);

  const handleAddNew = useCallback(async (valueToAdd: string) => {
    if (!valueToAdd.trim()) return;

    try {
      setIsLoading(true);

      if (onAddNew) {
        const newOption = await onAddNew(valueToAdd.trim());
        onChange(name, newOption.value || newOption.id);
      } else {
        // If no onAddNew handler, just use the string value
        onChange(name, valueToAdd.trim());
      }

      setNewValue('');
      setIsAddingNew(false);
    } catch (error) {
      console.error('Error adding new value:', error);
    } finally {
      setIsLoading(false);
    }
  }, [name, onChange, onAddNew]);

  const handleInputKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && newValue.trim()) {
      event.preventDefault();
      handleAddNew(newValue);
    }
  };

  return (
    <FormControl fullWidth={fullWidth} error={!!error}>
      <Autocomplete
        freeSolo={freeSolo}
        options={autocompleteOptions}
        value={currentOption || null}
        onChange={handleAutocompleteChange}
        getOptionLabel={(option) => {
          if (typeof option === 'string') return option;
          return option.label || '';
        }}
        isOptionEqualToValue={(option, value) => {
          if (typeof option === 'string' && typeof value === 'string') {
            return option === value;
          }
          return option.id === value?.id || option.value === value?.value;
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            error={!!error}
            helperText={error || helperText}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {params.InputProps.endAdornment}
                  {onAddNew && !isAddingNew && (
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => setIsAddingNew(true)}
                      sx={{
                        minWidth: 'auto',
                        fontSize: '0.75rem',
                        padding: '2px 6px'
                      }}
                    >
                      Add New
                    </Button>
                  )}
                </Box>
              ),
            }}
          />
        )}
        renderOption={(props, option) => (
          <li {...props} key={option.id}>
            <Typography variant="body2">{option.label}</Typography>
          </li>
        )}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              variant="outlined"
              label={option.label}
              {...getTagProps({ index })}
              key={option.id}
            />
          ))
        }
        loading={isLoading}
        disabled={isLoading}
      />

      {/* Add new value dialog */}
      {isAddingNew && (
        <Box sx={{ mt: 1, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Add New {label}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              size="small"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyPress={handleInputKeyPress}
              placeholder={`Enter new ${label.toLowerCase()}`}
              fullWidth
              disabled={isLoading}
            />
            <Button
              size="small"
              variant="contained"
              onClick={() => handleAddNew(newValue)}
              disabled={!newValue.trim() || isLoading}
            >
              Add
            </Button>
            <Button
              size="small"
              onClick={() => {
                setIsAddingNew(false);
                setNewValue('');
              }}
              disabled={isLoading}
            >
              <CloseIcon fontSize="small" />
            </Button>
          </Box>
        </Box>
      )}
    </FormControl>
  );
};

export default SelectOrAddField;