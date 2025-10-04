import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Chip,
  Alert,
  LinearProgress,
  Fab,
  Dialog,
  DialogContent,
  Grid,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Login,
  Logout,
  MyLocation,
  Schedule,
  LocationOn,
  Wifi,
  WifiOff,
  BatteryFull,
  Signal,
  Close,
  History,
  Person,
  Today,
  AccessTime,
  CheckCircle,
  Warning,
  Refresh
} from '@mui/icons-material';

interface AttendanceStatus {
  isCheckedIn: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  location?: string;
  totalHours: number;
  isLate: boolean;
  lateMinutes: number;
}

interface LocationInfo {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
  isWithinGeofence: boolean;
  distance?: number;
}

interface WorkLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
}

const MobileAttendanceApp: React.FC = () => {
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>({
    isCheckedIn: false,
    totalHours: 0,
    isLate: false,
    lateMinutes: 0
  });

  const [currentLocation, setCurrentLocation] = useState<LocationInfo | null>(null);
  const [workLocations] = useState<WorkLocation[]>([
    { id: 1, name: 'Head Office', latitude: 12.9141, longitude: 74.8560, radius: 100 },
    { id: 2, name: 'Branch Office', latitude: 12.9160, longitude: 74.8570, radius: 50 }
  ]);

  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [autoSync, setAutoSync] = useState(true);
  const [showLocationDialog, setShowLocationDialog] = useState(false);

  // Real employee data from authentication
  const [employee, setEmployee] = useState({
    id: null,
    name: 'Loading...',
    employee_id: 'Loading...',
    department: 'Loading...',
    shift: 'Loading...'
  });

  useEffect(() => {
    // Check online status
    const handleOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    // Get initial location
    getCurrentLocation();

    // Load employee data from authentication
    loadEmployeeData();

    // Check battery status (if supported)
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      });
    }

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  const loadEmployeeData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setLocationError('Authentication required. Please login first.');
        return;
      }

      // Get current user data from JWT token or API
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/employees/current`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setEmployee({
            id: result.data.id,
            name: `${result.data.first_name} ${result.data.last_name}`,
            employee_id: result.data.employee_id,
            department: result.data.department || 'Not Assigned',
            shift: result.data.shift_name || 'General Shift (9:00 AM - 6:00 PM)'
          });
        }
      } else {
        // Fallback to mock data for demo
        setEmployee({
          id: 1,
          name: 'Demo User',
          employee_id: 'DEMO/001',
          department: 'Demo Department',
          shift: 'General Shift (9:00 AM - 6:00 PM)'
        });
      }
    } catch (error) {
      console.error('Error loading employee data:', error);
      // Fallback to mock data
      setEmployee({
        id: 1,
        name: 'Demo User',
        employee_id: 'DEMO/001',
        department: 'Demo Department',
        shift: 'General Shift (9:00 AM - 6:00 PM)'
      });
    }
  };

  const getCurrentLocation = () => {
    setLoading(true);
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        // Check if within any work location
        const nearbyLocation = workLocations.find(location => {
          const distance = calculateDistance(latitude, longitude, location.latitude, location.longitude);
          return distance <= location.radius;
        });

        setCurrentLocation({
          latitude,
          longitude,
          accuracy,
          isWithinGeofence: !!nearbyLocation,
          distance: nearbyLocation ?
            calculateDistance(latitude, longitude, nearbyLocation.latitude, nearbyLocation.longitude) :
            undefined
        });

        setLoading(false);
      },
      (error) => {
        setLocationError(getLocationErrorMessage(error.code));
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const getLocationErrorMessage = (code: number): string => {
    switch (code) {
      case 1: return 'Location access denied. Please enable location permissions.';
      case 2: return 'Location unavailable. Please try again.';
      case 3: return 'Location request timeout. Please try again.';
      default: return 'Unknown location error occurred.';
    }
  };

  const handleAttendanceAction = async (action: 'check_in' | 'check_out') => {
    if (!employee.id) {
      setLocationError('Employee authentication required');
      return;
    }

    if (!currentLocation) {
      setLocationError('Please get your current location first');
      return;
    }

    if (action === 'check_in' && !currentLocation.isWithinGeofence) {
      setLocationError('You must be within a designated work location to check in');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/enhanced-attendance/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          employee_id: employee.id,
          action,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          notes: `Mobile attendance ${action} via VTRIA ERP App`
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        if (action === 'check_in') {
          setAttendanceStatus({
            isCheckedIn: true,
            checkInTime: new Date().toISOString(),
            totalHours: 0,
            isLate: result.data.is_late || false,
            lateMinutes: result.data.late_minutes || 0,
            location: result.data.location || 'Office Location'
          });
        } else {
          setAttendanceStatus(prev => ({
            ...prev,
            checkOutTime: new Date().toISOString(),
            totalHours: result.data.total_hours || 0
          }));
        }
        
        setLocationError(''); // Clear any previous errors
      } else {
        const error = await response.json();
        setLocationError(error.message || 'Failed to record attendance');
      }
    } catch (error) {
      console.error('Error recording attendance:', error);
      setLocationError('Failed to record attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '--';
    return new Date(timeString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getConnectionStatus = () => {
    if (!isOnline) return { color: 'error', text: 'Offline', icon: <WifiOff /> };
    return { color: 'success', text: 'Online', icon: <Wifi /> };
  };

  const getBatteryColor = () => {
    if (batteryLevel > 50) return 'success';
    if (batteryLevel > 20) return 'warning';
    return 'error';
  };

  return (
    <Box sx={{
      maxWidth: 400,
      mx: 'auto',
      bgcolor: 'grey.50',
      minHeight: '100vh',
      position: 'relative'
    }}>
      {/* Status Bar */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        px: 2,
        py: 1,
        bgcolor: 'primary.main',
        color: 'white'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getConnectionStatus().icon}
          <Typography variant="caption">
            {getConnectionStatus().text}
          </Typography>
        </Box>

        <Typography variant="h6">
          Attendance
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BatteryFull color={getBatteryColor() as any} />
          <Typography variant="caption">{batteryLevel}%</Typography>
        </Box>
      </Box>

      {/* Employee Info Card */}
      <Card sx={{ m: 2, mb: 1 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 56, height: 56 }}>
              <Person sx={{ fontSize: 32 }} />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6">{employee.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {employee.employee_id} • {employee.department}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {employee.shift}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Today's Status */}
      <Card sx={{ mx: 2, mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
              <Today sx={{ mr: 1 }} />
              Today's Status
            </Typography>
            <Chip
              label={attendanceStatus.isCheckedIn ? 'Active' : 'Not Started'}
              color={attendanceStatus.isCheckedIn ? 'success' : 'default'}
              size="small"
            />
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Check In</Typography>
                <Typography variant="h6" color={attendanceStatus.checkInTime ? 'success.main' : 'text.secondary'}>
                  {formatTime(attendanceStatus.checkInTime)}
                </Typography>
                {attendanceStatus.isLate && (
                  <Typography variant="caption" color="warning.main">
                    Late by {attendanceStatus.lateMinutes} min
                  </Typography>
                )}
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Check Out</Typography>
                <Typography variant="h6" color={attendanceStatus.checkOutTime ? 'success.main' : 'text.secondary'}>
                  {formatTime(attendanceStatus.checkOutTime)}
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Total Hours:</Typography>
            <Typography variant="body2" fontWeight="bold">
              {Number(attendanceStatus.totalHours).toFixed(2)}h
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Location Info */}
      <Card sx={{ mx: 2, mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
              <LocationOn sx={{ mr: 1 }} />
              Location Status
            </Typography>
            <IconButton size="small" onClick={() => setShowLocationDialog(true)}>
              <MyLocation />
            </IconButton>
          </Box>

          {loading && <LinearProgress sx={{ mb: 2 }} />}

          {currentLocation ? (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                {currentLocation.isWithinGeofence ? (
                  <CheckCircle color="success" sx={{ mr: 1 }} />
                ) : (
                  <Warning color="error" sx={{ mr: 1 }} />
                )}
                <Typography variant="body2">
                  {currentLocation.isWithinGeofence
                    ? 'Within work location'
                    : 'Outside work location'
                  }
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Accuracy: ±{Math.round(currentLocation.accuracy)}m
              </Typography>
              {currentLocation.distance && (
                <Typography variant="caption" color="text.secondary" display="block">
                  Distance: {Math.round(currentLocation.distance)}m from office
                </Typography>
              )}
            </Box>
          ) : (
            <Button
              variant="outlined"
              startIcon={<MyLocation />}
              fullWidth
              onClick={getCurrentLocation}
              disabled={loading}
            >
              Get Current Location
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Error Alerts */}
      {locationError && (
        <Alert severity="error" sx={{ mx: 2, mb: 2 }} onClose={() => setLocationError('')}>
          {locationError}
        </Alert>
      )}

      {!isOnline && (
        <Alert severity="warning" sx={{ mx: 2, mb: 2 }}>
          You are offline. Attendance will be synced when connection is restored.
        </Alert>
      )}

      {/* Settings */}
      <Card sx={{ mx: 2, mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Quick Settings</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
              />
            }
            label="Auto-sync when online"
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Box sx={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
        {!attendanceStatus.isCheckedIn ? (
          <Fab
            color="success"
            variant="extended"
            onClick={() => handleAttendanceAction('check_in')}
            disabled={loading || !currentLocation?.isWithinGeofence}
            sx={{ minWidth: 120 }}
          >
            <Login sx={{ mr: 1 }} />
            Check In
          </Fab>
        ) : !attendanceStatus.checkOutTime ? (
          <Fab
            color="error"
            variant="extended"
            onClick={() => handleAttendanceAction('check_out')}
            disabled={loading}
            sx={{ minWidth: 120 }}
          >
            <Logout sx={{ mr: 1 }} />
            Check Out
          </Fab>
        ) : (
          <Fab
            color="primary"
            variant="extended"
            onClick={() => window.location.reload()}
            sx={{ minWidth: 120 }}
          >
            <Refresh sx={{ mr: 1 }} />
            New Day
          </Fab>
        )}
      </Box>

      {/* Location Details Dialog */}
      <Dialog
        open={showLocationDialog}
        onClose={() => setShowLocationDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Location Details</Typography>
            <IconButton onClick={() => setShowLocationDialog(false)}>
              <Close />
            </IconButton>
          </Box>

          {currentLocation && (
            <Box>
              <Typography variant="body2" gutterBottom>
                <strong>Coordinates:</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Lat: {currentLocation.latitude.toFixed(6)}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Lng: {currentLocation.longitude.toFixed(6)}
              </Typography>

              <Typography variant="body2" sx={{ mt: 2 }} gutterBottom>
                <strong>Work Locations:</strong>
              </Typography>

              <List dense>
                {workLocations.map((location) => {
                  const distance = calculateDistance(
                    currentLocation.latitude,
                    currentLocation.longitude,
                    location.latitude,
                    location.longitude
                  );
                  const isNearby = distance <= location.radius;

                  return (
                    <ListItem key={location.id}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: isNearby ? 'success.main' : 'grey.400' }}>
                          {isNearby ? <CheckCircle /> : <LocationOn />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={location.name}
                        secondary={`${Math.round(distance)}m away • ${location.radius}m radius`}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          )}

          <Button
            variant="outlined"
            startIcon={<Refresh />}
            fullWidth
            onClick={getCurrentLocation}
            disabled={loading}
            sx={{ mt: 2 }}
          >
            Refresh Location
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default MobileAttendanceApp;