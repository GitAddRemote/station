import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { API_URL } from '../config/api';

const ProtectedRoute = () => {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/auth/me`, { credentials: 'include' })
      .then((res) => setAuthed(res.ok))
      .catch(() => setAuthed(false));
  }, []);

  if (authed === null) return null;
  if (!authed) return <Navigate to="/login" replace />;
  return <Outlet />;
};

export default ProtectedRoute;
