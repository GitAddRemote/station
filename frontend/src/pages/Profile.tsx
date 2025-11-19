import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SaveIcon from '@mui/icons-material/Save';

const Profile = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    bio: '',
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${apiUrl}/users/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const userData = data.data || data;
          setProfile({
            username: userData.username || '',
            email: userData.email || '',
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            phoneNumber: userData.phoneNumber || '',
            bio: userData.bio || '',
          });
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

  const handleDashboard = () => {
    handleClose();
    navigate('/dashboard');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${apiUrl}/users/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          phoneNumber: profile.phoneNumber,
          bio: profile.bio,
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'An error occurred while updating your profile' });
    } finally {
      setSaving(false);
    }
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
              {profile.username.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem onClick={handleDashboard}>
              <DashboardIcon sx={{ mr: 1 }} /> Dashboard
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1 }} /> Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography
          variant="h3"
          sx={{
            mb: 1,
            fontWeight: 700,
            color: '#e8eaed',
          }}
        >
          My Profile
        </Typography>
        <Typography
          variant="body1"
          sx={{
            mb: 4,
            color: '#9aa0a6',
          }}
        >
          Update your personal information
        </Typography>

        {message.text && (
          <Alert severity={message.type as 'success' | 'error'} sx={{ mb: 3 }}>
            {message.text}
          </Alert>
        )}

        <Card>
          <CardContent sx={{ p: 4 }}>
            <form onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <TextField
                  label="Username"
                  value={profile.username}
                  disabled
                  fullWidth
                  helperText="Username cannot be changed"
                />

                <TextField
                  label="Email"
                  value={profile.email}
                  disabled
                  fullWidth
                  helperText="Email cannot be changed"
                />

                <TextField
                  label="First Name"
                  name="firstName"
                  value={profile.firstName}
                  onChange={handleInputChange}
                  fullWidth
                  inputProps={{
                    'aria-label': 'First Name',
                  }}
                />

                <TextField
                  label="Last Name"
                  name="lastName"
                  value={profile.lastName}
                  onChange={handleInputChange}
                  fullWidth
                  inputProps={{
                    'aria-label': 'Last Name',
                  }}
                />

                <TextField
                  label="Phone Number"
                  name="phoneNumber"
                  value={profile.phoneNumber}
                  onChange={handleInputChange}
                  fullWidth
                  placeholder="+1234567890"
                  helperText="Use E.164 format (e.g., +1234567890)"
                  inputProps={{
                    'aria-label': 'Phone Number',
                  }}
                />

                <TextField
                  label="Bio"
                  name="bio"
                  value={profile.bio}
                  onChange={handleInputChange}
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="Tell us about yourself..."
                  inputProps={{
                    maxLength: 500,
                    'aria-label': 'Bio',
                  }}
                  helperText={`${profile.bio.length}/500 characters`}
                />

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    startIcon={<SaveIcon />}
                    disabled={saving}
                    sx={{ flex: 1 }}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => navigate('/dashboard')}
                    sx={{ flex: 1 }}
                  >
                    Cancel
                  </Button>
                </Box>
              </Stack>
            </form>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default Profile;
