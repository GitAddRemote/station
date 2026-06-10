import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  Stack,
  CircularProgress,
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import { API_URL } from '../config/api';

const ForcedPasswordChange = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(
        'Invalid or missing pre-auth token. Please log in again to receive a new one.',
      );
    }
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!token) {
      setError('Invalid or missing pre-auth token');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/forced-password-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Pre-Auth-Token': token,
        },
        credentials: 'include',
        body: JSON.stringify({ newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'Password changed successfully!');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => navigate('/dashboard'), 1500);
      } else {
        setError(data.message || 'Failed to change password');
      }
    } catch {
      setError('Cannot connect to server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#1e2328',
      }}
    >
      <Container maxWidth="sm">
        <Box textAlign="center" sx={{ mb: 4 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #4A9EFF 0%, #7ABDFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1,
            }}
          >
            STATION
          </Typography>
          <Typography variant="h5" sx={{ color: '#e8eaed', mb: 1 }}>
            Change Your Password
          </Typography>
          <Typography sx={{ color: '#9aa0a6' }}>
            A password change is required before you can continue.
          </Typography>
        </Box>

        <Card>
          <CardContent sx={{ p: 4 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {success}
              </Alert>
            )}

            {!token ? (
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ color: '#9aa0a6', mb: 3 }}>
                  This link is invalid or has expired. Please log in again.
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => navigate('/login/credentials')}
                  fullWidth
                >
                  Back to Login
                </Button>
              </Box>
            ) : success ? (
              <Box sx={{ textAlign: 'center' }}>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography sx={{ color: '#9aa0a6' }}>
                  Redirecting to your dashboard...
                </Typography>
              </Box>
            ) : (
              <form onSubmit={handleSubmit}>
                <Stack spacing={3}>
                  <TextField
                    label="New Password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    fullWidth
                    required
                    autoFocus
                    helperText="Minimum 6 characters"
                    inputProps={{
                      minLength: 6,
                      'aria-label': 'New Password',
                      'aria-required': 'true',
                    }}
                  />

                  <TextField
                    label="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    fullWidth
                    required
                    inputProps={{
                      'aria-label': 'Confirm New Password',
                      'aria-required': 'true',
                    }}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={loading}
                    startIcon={<LockResetIcon />}
                  >
                    {loading ? 'Changing Password...' : 'Change Password'}
                  </Button>
                </Stack>
              </form>
            )}
          </CardContent>
        </Card>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Link
            to="/login/credentials"
            style={{ color: '#9aa0a6', textDecoration: 'none' }}
          >
            ← Back to Login
          </Link>
        </Box>
      </Container>
    </Box>
  );
};

export default ForcedPasswordChange;
