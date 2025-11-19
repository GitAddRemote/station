import { createTheme } from '@mui/material/styles';

// Create a custom dark theme for Station inspired by gitaddremote.com
// Using medium blue and glowing blue accents
export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4A9EFF', // Medium blue
      light: '#7ABDFF',
      dark: '#2563EB', // Deeper blue
      contrastText: '#fff',
    },
    secondary: {
      main: '#60A5FA', // Sky blue
      light: '#93C5FD',
      dark: '#3B82F6',
      contrastText: '#fff',
    },
    background: {
      default: '#1e2328', // Dark charcoal from gitaddremote
      paper: '#2a2f35', // Slightly lighter for contrast
    },
    text: {
      primary: '#e8eaed', // Light gray text from gitaddremote
      secondary: '#9aa0a6', // Muted gray for secondary text
    },
    error: {
      main: '#ff6b6b',
    },
    success: {
      main: '#4ade80',
    },
    info: {
      main: '#60A5FA',
    },
    warning: {
      main: '#fbbf24',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: '6px',
          padding: '10px 24px',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 0 20px rgba(74, 158, 255, 0.4)', // Glowing blue effect
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #4A9EFF 0%, #2563EB 100%)',
          boxShadow: '0 4px 12px rgba(74, 158, 255, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #7ABDFF 0%, #4A9EFF 100%)',
            boxShadow: '0 0 25px rgba(74, 158, 255, 0.5)',
          },
        },
        outlined: {
          borderColor: '#4A9EFF',
          color: '#4A9EFF',
          '&:hover': {
            borderColor: '#7ABDFF',
            backgroundColor: 'rgba(74, 158, 255, 0.1)',
            boxShadow: '0 0 15px rgba(74, 158, 255, 0.3)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#2a2f35',
          borderRadius: '12px',
          border: '1px solid rgba(74, 158, 255, 0.1)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: 'rgba(74, 158, 255, 0.3)',
            boxShadow: '0 8px 24px rgba(74, 158, 255, 0.2)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'rgba(74, 158, 255, 0.3)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(74, 158, 255, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#4A9EFF',
              boxShadow: '0 0 10px rgba(74, 158, 255, 0.3)',
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#2a2f35',
        },
      },
    },
    MuiStack: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(90deg, #1e2328 0%, #2a2f35 100%)',
          borderBottom: '1px solid rgba(74, 158, 255, 0.2)',
          boxShadow: '0 2px 12px rgba(74, 158, 255, 0.1)',
        },
      },
    },
  },
});

export default theme;
