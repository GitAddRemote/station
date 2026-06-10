import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#53AEF7',    // aqua-400 — RSI Cornflower Blue
      light: '#7CBEF9',   // aqua-300
      dark: '#1E7FD6',    // aqua-600
      contrastText: '#06151F',
    },
    secondary: {
      main: '#F57962',    // coral-400
      light: '#FB9E8C',   // coral-300
      dark: '#DC4329',    // coral-600
      contrastText: '#2A0B05',
    },
    background: {
      default: '#0B1D29', // ink-950 — Firefly canvas
      paper: '#102733',   // surface-card
    },
    text: {
      primary: '#EAF1F7',
      secondary: 'rgba(169, 179, 189, 0.66)',
    },
    error: {
      main: '#F05A45',
    },
    success: {
      main: '#1F8A5B',
    },
    info: {
      main: '#53AEF7',
    },
    warning: {
      main: '#E0961A',
    },
    divider: 'rgba(124, 190, 249, 0.16)',
  },
  typography: {
    fontFamily: "'Hanken Grotesk', ui-sans-serif, system-ui, -apple-system, sans-serif",
    h1: { fontFamily: "'Space Grotesk', ui-sans-serif, sans-serif", fontWeight: 700, letterSpacing: '-0.015em' },
    h2: { fontFamily: "'Space Grotesk', ui-sans-serif, sans-serif", fontWeight: 700, letterSpacing: '-0.015em' },
    h3: { fontFamily: "'Space Grotesk', ui-sans-serif, sans-serif", fontWeight: 600, letterSpacing: '-0.015em' },
    h4: { fontFamily: "'Space Grotesk', ui-sans-serif, sans-serif", fontWeight: 600 },
    h5: { fontFamily: "'Space Grotesk', ui-sans-serif, sans-serif", fontWeight: 600 },
    h6: { fontFamily: "'Space Grotesk', ui-sans-serif, sans-serif", fontWeight: 600 },
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
          borderRadius: '8px',
          padding: '9px 20px',
        },
        contained: {
          background: 'linear-gradient(135deg, #53AEF7 0%, #1E7FD6 100%)',
          boxShadow: '0 4px 12px rgba(83, 174, 247, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #7CBEF9 0%, #2E96EE 100%)',
            boxShadow: '0 0 20px rgba(83, 174, 247, 0.45)',
          },
        },
        outlined: {
          borderColor: 'rgba(124, 190, 249, 0.30)',
          '&:hover': {
            borderColor: 'rgba(83, 174, 247, 0.6)',
            backgroundColor: 'rgba(83, 174, 247, 0.08)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#102733',
          borderRadius: '16px',
          border: '1px solid rgba(124, 190, 249, 0.08)',
          backgroundImage: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#102733',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'rgba(124, 190, 249, 0.16)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(124, 190, 249, 0.30)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#53AEF7',
            },
          },
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
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            backgroundColor: '#08161F',
            borderBottom: '1px solid rgba(124, 190, 249, 0.08)',
          },
        },
      },
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          '& .MuiTableRow-root': {
            '&:hover': {
              backgroundColor: 'rgba(83, 174, 247, 0.05)',
            },
          },
          '& .MuiTableCell-root': {
            borderBottom: '1px solid rgba(124, 190, 249, 0.06)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
        },
        outlined: {
          borderColor: 'rgba(124, 190, 249, 0.30)',
        },
        colorPrimary: {
          borderColor: 'rgba(83, 174, 247, 0.50)',
          color: '#53AEF7',
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        html: { height: '100%' },
        body: { height: '100%' },
        '#root': { height: '100%' },
      },
    },
  },
});

export default theme;
