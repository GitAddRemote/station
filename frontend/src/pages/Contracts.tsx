import { Box, Typography } from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import AppShell from '../components/AppShell';

const Contracts = () => (
  <AppShell active="contracts" searchPlaceholder="Search contracts…">
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        gap: 2,
        color: 'text.secondary',
      }}
    >
      <ArticleIcon sx={{ fontSize: 64, opacity: 0.3 }} />
      <Typography variant="h5" fontWeight={600}>
        Contracts
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.6 }}>
        Coming in a future milestone
      </Typography>
    </Box>
  </AppShell>
);

export default Contracts;
