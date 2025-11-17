import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';

const Dashboard = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:3000/users/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.data || data);
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  const handleProfile = () => {
    handleClose();
    navigate('/profile');
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: '#1e2328',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#1e2328' }}>
      {/* Navigation */}
      <AppBar position="static">
        <Toolbar>
          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #4A9EFF 0%, #7ABDFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/dashboard')}
          >
            STATION
          </Typography>
          <IconButton color="inherit" onClick={handleMenu}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: '#4A9EFF' }}>
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem onClick={handleProfile}>
              <PersonIcon sx={{ mr: 1 }} /> Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1 }} /> Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Typography
          variant="h3"
          sx={{
            mb: 1,
            fontWeight: 700,
            color: '#e8eaed',
          }}
        >
          Welcome back, {user?.username}!
        </Typography>
        <Typography
          variant="body1"
          sx={{
            mb: 4,
            color: '#9aa0a6',
          }}
        >
          {user?.email}
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card
              sx={{
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
              }}
              onClick={() => navigate('/profile')}
            >
              <CardContent>
                <Box
                  sx={{
                    display: 'inline-flex',
                    p: 2,
                    borderRadius: '12px',
                    background: 'rgba(74, 158, 255, 0.1)',
                    mb: 2,
                  }}
                >
                  <PersonIcon sx={{ fontSize: 32, color: '#4A9EFF' }} />
                </Box>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                  My Profile
                </Typography>
                <Typography sx={{ color: '#9aa0a6' }}>
                  View and update your profile information
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              sx={{
                height: '100%',
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: 'inline-flex',
                    p: 2,
                    borderRadius: '12px',
                    background: 'rgba(74, 158, 255, 0.1)',
                    mb: 2,
                  }}
                >
                  <GroupsIcon sx={{ fontSize: 32, color: '#4A9EFF' }} />
                </Box>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                  My Organizations
                </Typography>
                <Typography sx={{ color: '#9aa0a6', mb: 2 }}>
                  You are not a member of any organizations yet
                </Typography>
                <Button variant="outlined" size="small">
                  Create Organization
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              sx={{
                height: '100%',
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: 'inline-flex',
                    p: 2,
                    borderRadius: '12px',
                    background: 'rgba(74, 158, 255, 0.1)',
                    mb: 2,
                  }}
                >
                  <GroupsIcon sx={{ fontSize: 32, color: '#4A9EFF' }} />
                </Box>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                  Invitations
                </Typography>
                <Typography sx={{ color: '#9aa0a6' }}>
                  No pending invitations
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, color: '#e8eaed' }}>
            Quick Actions
          </Typography>
          <Grid container spacing={2}>
            <Grid item>
              <Button
                variant="contained"
                startIcon={<GroupsIcon />}
                onClick={() => alert('Create Organization feature coming soon!')}
              >
                Create Organization
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                startIcon={<PersonIcon />}
                onClick={() => navigate('/profile')}
              >
                Edit Profile
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
};

export default Dashboard;
