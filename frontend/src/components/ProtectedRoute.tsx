import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { api } from '../services/api.service';
import { API_URL } from '../config/api';

interface AuthConfig {
  inviteOnly: boolean;
}

const ProtectedRoute = () => {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [inviteOnly, setInviteOnly] = useState<boolean>(false);

  useEffect(() => {
    let resolved = false;

    fetch(`${API_URL}/auth/config`)
      .then((res) => res.json())
      .then((cfg: AuthConfig) => {
        if (!resolved) setInviteOnly(cfg.inviteOnly ?? false);
      })
      .catch(() => {});

    api
      .get('/auth/me')
      .then(() => {
        resolved = true;
        setAuthed(true);
      })
      .catch((err) => {
        if (err?.response?.status === 401) {
          resolved = true;
          setAuthed(false);
        }
        // network / 5xx — keep spinner, don't boot user
      });
  }, []);

  if (authed === null) {
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

  if (!authed) {
    return <Navigate to={inviteOnly ? '/' : '/login'} replace />;
  }
  return <Outlet />;
};

export default ProtectedRoute;
