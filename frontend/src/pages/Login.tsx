import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import EmailIcon from '@mui/icons-material/Email';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();

        // Store tokens
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);

        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        const errorData = await response.json();
        console.error('Login error:', errorData);
        setError(errorData.message || errorData.error || 'Invalid username or password');
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Cannot connect to server. Please make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setResetError('');
    setResetSuccess('');
    setResetLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setResetSuccess(data.message);
        setResetEmail('');
      } else {
        setResetError(data.message || 'Failed to send reset email');
      }
    } catch (err: unknown) {
      console.error('Forgot password error:', err);
      setResetError('Cannot connect to server. Please try again later.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleCloseForgotPassword = () => {
    setForgotPasswordOpen(false);
    setResetEmail('');
    setResetSuccess('');
    setResetError('');
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
            Welcome Back
          </Typography>
          <Typography sx={{ color: '#9aa0a6' }}>
            Sign in to manage your gaming guilds
          </Typography>
        </Box>

        <Card>
          <CardContent sx={{ p: 4 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <TextField
                  label="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  fullWidth
                  required
                  autoFocus
                  inputProps={{
                    'aria-label': 'Username',
                    'aria-required': 'true',
                  }}
                />

                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  required
                  inputProps={{
                    'aria-label': 'Password',
                    'aria-required': 'true',
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  startIcon={<LoginIcon />}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>

                <Box sx={{ textAlign: 'right' }}>
                  <Button
                    onClick={() => setForgotPasswordOpen(true)}
                    sx={{
                      color: '#4A9EFF',
                      textTransform: 'none',
                      '&:hover': { backgroundColor: 'rgba(74, 158, 255, 0.1)' },
                    }}
                  >
                    Forgot password?
                  </Button>
                </Box>
              </Stack>
            </form>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography sx={{ color: '#9aa0a6' }}>
                Don't have an account?{' '}
                <Link
                  to="/register"
                  style={{
                    color: '#4A9EFF',
                    textDecoration: 'none',
                    fontWeight: 500,
                  }}
                >
                  Sign Up
                </Link>
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Link
            to="/"
            style={{
              color: '#9aa0a6',
              textDecoration: 'none',
            }}
          >
            ← Back to Home
          </Link>
        </Box>

        {/* Forgot Password Dialog */}
        <Dialog
          open={forgotPasswordOpen}
          onClose={handleCloseForgotPassword}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Reset Password</DialogTitle>
          <DialogContent>
            {!resetSuccess && (
              <Typography sx={{ mb: 2, color: '#9aa0a6' }}>
                Enter your email address and we'll send you a link to reset your password.
              </Typography>
            )}

            {resetSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {resetSuccess}
              </Alert>
            )}

            {resetError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {resetError}
              </Alert>
            )}

            {!resetSuccess && (
              <TextField
                label="Email Address"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                fullWidth
                required
                autoFocus
                inputProps={{
                  'aria-label': 'Email Address',
                }}
              />
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            {resetSuccess ? (
              <Button onClick={handleCloseForgotPassword} variant="contained">
                Close
              </Button>
            ) : (
              <>
                <Button onClick={handleCloseForgotPassword} disabled={resetLoading}>
                  Cancel
                </Button>
                <Button
                  onClick={handleForgotPassword}
                  variant="contained"
                  disabled={!resetEmail || resetLoading}
                  startIcon={<EmailIcon />}
                >
                  {resetLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default Login;
