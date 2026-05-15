import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { API_URL } from '../config/api';

const ProtectedRoute = () => {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/auth/me`, { credentials: 'include' })
      .then((res) => {
        if (res.status === 401) {
          setAuthed(false);
        } else if (res.ok) {
          setAuthed(true);
        }
        // leave authed as null on other errors (5xx, network) — keep spinner
      })
      .catch(() => {
        // network error — don't redirect, keep spinner to avoid booting
        // users on a transient failure
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
