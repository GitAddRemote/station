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

const ResetPassword = () => {
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
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }

    setLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'Password has been reset successfully!');
        setNewPassword('');
        setConfirmPassword('');

        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch (err: unknown) {
      console.error('Reset password error:', err);
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
            Reset Your Password
          </Typography>
          <Typography sx={{ color: '#9aa0a6' }}>
            Enter your new password below
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
                  This password reset link is invalid or has expired.
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => navigate('/login')}
                  fullWidth
                >
                  Go to Login
                </Button>
              </Box>
            ) : success ? (
              <Box sx={{ textAlign: 'center' }}>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography sx={{ color: '#9aa0a6' }}>
                  Redirecting to login page...
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
                    {loading ? 'Resetting Password...' : 'Reset Password'}
                  </Button>
                </Stack>
              </form>
            )}
          </CardContent>
        </Card>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Link
            to="/login"
            style={{
              color: '#9aa0a6',
              textDecoration: 'none',
            }}
          >
            ← Back to Login
          </Link>
        </Box>
      </Container>
    </Box>
  );
};

export default ResetPassword;
