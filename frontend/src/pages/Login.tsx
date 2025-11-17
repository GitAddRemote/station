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
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        const tokens = data.data || data;

        // Store tokens
        localStorage.setItem('access_token', tokens.access_token);
        localStorage.setItem('refresh_token', tokens.refresh_token);

        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        const errorData = await response.json();
        console.error('Login error:', errorData);
        setError(errorData.message || errorData.error || 'Invalid username or password');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Cannot connect to server. Please make sure the backend is running.');
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
      </Container>
    </Box>
  );
};

export default Login;
