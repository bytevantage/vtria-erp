/**
 * Enhanced Futuristic Theme Configuration for VTRIA ERP Dashboard
 * Material-UI theme with modern, professional styling and responsive design
 * Features glass morphism, gradient effects, and futuristic UI elements
 */

import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// Create base theme
let theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2563eb', // Enhanced blue for more modern look
      light: '#60a5fa',
      dark: '#1d4ed8',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#9333ea', // Enhanced purple
      light: '#a855f7',
      dark: '#7e22ce',
      contrastText: '#ffffff'
    },
    background: {
      default: '#f8fafc', // Lighter background
      paper: 'rgba(255, 255, 255, 0.9)' // Semi-transparent for glass effect
    },
    text: {
      primary: '#0f172a', // Darker for better contrast
      secondary: '#475569'
    },
    success: {
      main: '#10b981', // Modern green
      light: '#34d399',
      dark: '#059669'
    },
    warning: {
      main: '#f59e0b', // Vibrant orange
      light: '#fbbf24',
      dark: '#d97706'
    },
    error: {
      main: '#ef4444', // Modern red
      light: '#f87171',
      dark: '#dc2626'
    },
    info: {
      main: '#3b82f6', // Bright blue
      light: '#60a5fa',
      dark: '#2563eb'
    },
    // Custom colors for futuristic UI
    futuristic: {
      gradient1: 'linear-gradient(135deg, rgba(37, 99, 235, 0.9) 0%, rgba(147, 51, 234, 0.9) 100%)',
      gradient2: 'linear-gradient(135deg, rgba(16, 185, 129, 0.9) 0%, rgba(59, 130, 246, 0.9) 100%)',
      gradient3: 'linear-gradient(135deg, rgba(245, 158, 11, 0.9) 0%, rgba(239, 68, 68, 0.9) 100%)',
      glow: '0 0 15px rgba(37, 99, 235, 0.5)',
      glassBg: 'rgba(255, 255, 255, 0.7)',
      glassBorder: 'rgba(255, 255, 255, 0.5)',
      darkGlassBg: 'rgba(15, 23, 42, 0.7)'
    }
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", "Helvetica", "Arial", sans-serif', // Modern font
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.01em'
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.01em'
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.01em'
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5
    },
    button: {
      textTransform: 'none',
      fontWeight: 500
    },
    // Responsive font sizes for different breakpoints handled by responsiveFontSizes()
  },
  shape: {
    borderRadius: 16 // Increased border radius for modern look
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
    '0px 4px 8px rgba(0, 0, 0, 0.08)',
    '0px 6px 12px rgba(0, 0, 0, 0.1)',
    '0px 8px 16px rgba(0, 0, 0, 0.12)',
    '0px 10px 20px rgba(0, 0, 0, 0.14)',
    '0px 12px 24px rgba(0, 0, 0, 0.16)',
    '0px 14px 28px rgba(0, 0, 0, 0.18)',
    '0px 16px 32px rgba(0, 0, 0, 0.2)',
    '0px 18px 36px rgba(0, 0, 0, 0.22)',
    '0px 20px 40px rgba(0, 0, 0, 0.24)',
    '0px 22px 44px rgba(0, 0, 0, 0.26)',
    '0px 24px 48px rgba(0, 0, 0, 0.28)',
    '0px 26px 52px rgba(0, 0, 0, 0.3)',
    '0px 28px 56px rgba(0, 0, 0, 0.32)',
    '0px 30px 60px rgba(0, 0, 0, 0.34)',
    '0px 32px 64px rgba(0, 0, 0, 0.36)',
    '0px 34px 68px rgba(0, 0, 0, 0.38)',
    '0px 36px 72px rgba(0, 0, 0, 0.4)',
    '0px 38px 76px rgba(0, 0, 0, 0.42)',
    '0px 40px 80px rgba(0, 0, 0, 0.44)',
    '0px 42px 84px rgba(0, 0, 0, 0.46)',
    '0px 44px 88px rgba(0, 0, 0, 0.48)',
    '0px 46px 92px rgba(0, 0, 0, 0.5)',
    '0px 48px 96px rgba(0, 0, 0, 0.52)'
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f8fafc',
          backgroundImage: 'linear-gradient(135deg, #f8fafc 0%, #dbeafe 100%)',
          minHeight: '100vh',
          overflowX: 'hidden',
          '&::-webkit-scrollbar': {
            width: '8px',
            background: 'transparent'
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(37, 99, 235, 0.3)',
            borderRadius: '4px',
            '&:hover': {
              background: 'rgba(37, 99, 235, 0.5)'
            }
          },
          // Add responsive font loading
          '@font-face': [
            {
              fontFamily: 'Plus Jakarta Sans',
              fontStyle: 'normal',
              fontWeight: 400,
              fontDisplay: 'swap',
              src: `url(https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap)`
            }
          ]
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          backdropFilter: 'blur(10px)',
          background: 'rgba(255, 255, 255, 0.7)',
          transition: 'all 0.3s ease-in-out',
          overflow: 'hidden',
          position: 'relative',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0px 8px 30px rgba(37, 99, 235, 0.15)'
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 100%)',
            opacity: 0.7,
            zIndex: 0
          },
          '& > *': {
            position: 'relative',
            zIndex: 1
          }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 2px 12px rgba(0, 0, 0, 0.06)'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 24px',
          fontSize: '0.95rem',
          fontWeight: 500,
          textTransform: 'none',
          boxShadow: 'none',
          transition: 'all 0.2s ease-in-out',
          position: 'relative',
          overflow: 'hidden',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0px 4px 12px rgba(37, 99, 235, 0.25)'
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
            transition: 'all 0.6s ease',
            zIndex: 0
          },
          '&:hover::before': {
            left: '100%'
          },
          '@media (max-width: 600px)': {
            padding: '8px 16px',
            fontSize: '0.85rem'
          }
        },
        contained: {
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)'
          },
          '&.MuiButton-containedPrimary': {
            boxShadow: '0 0 10px rgba(37, 99, 235, 0.5)'
          },
          '&.MuiButton-containedSecondary': {
            background: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #7e22ce 0%, #6b21a8 100%)'
            },
            boxShadow: '0 0 10px rgba(147, 51, 234, 0.5)'
          }
        },
        outlined: {
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px'
          }
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
          fontSize: '0.8rem'
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            '&:hover fieldset': {
              borderColor: '#1976d2'
            },
            '&.Mui-focused fieldset': {
              borderColor: '#1976d2',
              borderWidth: 2
            }
          }
        }
      }
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: 'rgba(255, 255, 255, 0.8)'
        }
      }
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid rgba(224, 224, 224, 0.5)'
        }
      }
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: 'rgba(25, 118, 210, 0.08)',
            fontWeight: 600,
            fontSize: '0.9rem',
            color: '#1976d2'
          }
        }
      }
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.04)'
          }
        }
      }
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '1rem',
            minHeight: 48,
            '&.Mui-selected': {
              color: '#1976d2',
              fontWeight: 600
            }
          },
          '& .MuiTabs-indicator': {
            height: 3,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)'
          }
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: '0px 10px 40px rgba(0, 0, 0, 0.15)'
        }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          '&.MuiAlert-standardSuccess': {
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            color: '#2e7d32'
          },
          '&.MuiAlert-standardError': {
            backgroundColor: 'rgba(244, 67, 54, 0.1)',
            color: '#c62828'
          },
          '&.MuiAlert-standardWarning': {
            backgroundColor: 'rgba(255, 152, 0, 0.1)',
            color: '#ef6c00'
          },
          '&.MuiAlert-standardInfo': {
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            color: '#1565c0'
          }
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'scale(1.05)',
            backgroundColor: 'rgba(25, 118, 210, 0.08)'
          }
        }
      }
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          borderRadius: 8,
          fontSize: '0.8rem',
          padding: '8px 12px'
        }
      }
    }
  }
});

// Apply responsive font sizes
theme = responsiveFontSizes(theme, {
  breakpoints: ['xs', 'sm', 'md', 'lg', 'xl'],
  factor: 2, // Stronger factor for more noticeable difference
});

export default theme;
