import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { api } from '../services/api.service';

const ProtectedRoute = () => {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => { console.debug('[ProtectedRoute] /auth/me ok', res.status); setAuthed(true); })
      .catch((err) => {
        console.debug('[ProtectedRoute] /auth/me failed', err?.response?.status, err?.response?.data);
        if (err?.response?.status === 401) {
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

  if (!authed) return <Navigate to="/login" replace />;
  return <Outlet />;
};

export default ProtectedRoute;
