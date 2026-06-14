import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import { API_URL } from '../config/api';

const DISCORD_BLUE = '#5865F2';

const ERROR_MESSAGES: Record<string, string> = {
  discord_denied: 'Login cancelled. Please try again.',
  state_invalid: 'Login session expired or invalid. Please try again.',
  discord_error: 'Something went wrong during Discord login. Please try again.',
  discord_no_email:
    'Your Discord account does not have an email address. Station requires a verified email to log in.',
  discord_unverified_email:
    "Your Discord account's email address is not verified. Please verify your email in Discord and try again.",
  email_conflict:
    'This email address is already linked to a different Discord account. Please contact an administrator.',
  discord_auth_failed: 'Discord authentication failed. Please try again.',
};

interface AuthConfig {
  discordEnabled: boolean;
  localLoginEnabled: boolean;
  inviteOnly: boolean;
}

const Login = () => {
  const [searchParams] = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [config, setConfig] = useState<AuthConfig | null>(null);

  useEffect(() => {
    const code = searchParams.get('error');
    if (code) {
      setErrorMessage(
        ERROR_MESSAGES[code] ??
          'Something went wrong during login. Please try again.',
      );
    }
  }, [searchParams]);

  useEffect(() => {
    fetch(`${API_URL}/auth/config`)
      .then((res) => res.json())
      .then((cfg: AuthConfig) => setConfig(cfg))
      .catch(() =>
        // Fail open so the page is not blank if the backend is unreachable
        setConfig({ discordEnabled: true, localLoginEnabled: true, inviteOnly: false }),
      );
  }, []);

  const handleDiscordLogin = () => {
    window.location.href = `${API_URL}/auth/discord`;
  };

  // Don't render until config is known to avoid flash of disabled buttons
  if (!config) return null;

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
            {errorMessage && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {errorMessage}
              </Alert>
            )}

            {config.discordEnabled && (
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleDiscordLogin}
                sx={{
                  backgroundColor: DISCORD_BLUE,
                  '&:hover': { backgroundColor: '#4752c4' },
                  fontWeight: 600,
                  fontSize: '1rem',
                  py: 1.5,
                }}
                startIcon={
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                  </svg>
                }
              >
                Login with Discord
              </Button>
            )}
          </CardContent>
        </Card>

        {config.localLoginEnabled && (
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Link
              to="/login/credentials"
              style={{
                color: '#9aa0a6',
                textDecoration: 'none',
                fontSize: '0.875rem',
              }}
            >
              Sign in with email
            </Link>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default Login;
