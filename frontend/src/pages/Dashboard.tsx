import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import GroupsIcon from '@mui/icons-material/Groups';
import InventoryPortlet from '../components/inventory/InventoryPortlet';
import AppShell from '../components/AppShell';
import { api } from '../services/api.service';

interface User {
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await api.get('/users/profile');
        setUser(response.data);
      } catch {
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: 'var(--surface-page)',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const userInitial = user?.firstName
    ? user.firstName.charAt(0).toUpperCase()
    : user?.username?.charAt(0).toUpperCase() || 'U';

  return (
    <AppShell
      active="dashboard"
      userInitial={userInitial}
      searchPlaceholder="Search inventory, members, orders…"
    >
      {/* Welcome header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h3"
          sx={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            letterSpacing: 'var(--tracking-tight)',
            color: 'var(--text-strong)',
            mb: 0.5,
          }}
        >
          Welcome back{user?.firstName ? `, ${user.firstName}` : user?.username ? `, ${user.username}` : ''}
        </Typography>
        <Typography variant="body2" sx={{ color: 'var(--text-muted)' }}>
          {user?.email}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Profile portlet */}
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              height: '100%',
              cursor: 'pointer',
              transition: 'border-color var(--dur-base) var(--ease-out)',
              '&:hover': { borderColor: 'rgba(83, 174, 247, 0.3)' },
            }}
            onClick={() => navigate('/profile')}
          >
            <CardContent>
              <Box
                sx={{
                  display: 'inline-flex',
                  p: 1.5,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--brand-subtle)',
                  mb: 2,
                }}
              >
                <PersonIcon sx={{ fontSize: 24, color: 'var(--brand)' }} />
              </Box>
              <Typography
                variant="h6"
                sx={{ mb: 0.5, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-strong)' }}
              >
                My Profile
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--text-muted)' }}>
                View and update your profile information
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Organizations portlet */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box
                sx={{
                  display: 'inline-flex',
                  p: 1.5,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--brand-subtle)',
                  mb: 2,
                }}
              >
                <GroupsIcon sx={{ fontSize: 24, color: 'var(--brand)' }} />
              </Box>
              <Typography
                variant="h6"
                sx={{ mb: 0.5, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-strong)' }}
              >
                My Organizations
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--text-muted)', mb: 2 }}>
                You are not a member of any organizations yet
              </Typography>
              <Button variant="outlined" size="small">
                Create Organization
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Invitations portlet */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box
                sx={{
                  display: 'inline-flex',
                  p: 1.5,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--brand-subtle)',
                  mb: 2,
                }}
              >
                <GroupsIcon sx={{ fontSize: 24, color: 'var(--brand)' }} />
              </Box>
              <Typography
                variant="h6"
                sx={{ mb: 0.5, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-strong)' }}
              >
                Invitations
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--text-muted)' }}>
                No pending invitations
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Inventory Portlet — full width */}
        <Grid item xs={12}>
          <InventoryPortlet onExpand={() => navigate('/inventory')} />
        </Grid>
      </Grid>
    </AppShell>
  );
};

export default Dashboard;
