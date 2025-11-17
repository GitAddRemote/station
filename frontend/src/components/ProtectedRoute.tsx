import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  const token = localStorage.getItem('access_token');

  if (!token) {
    // Redirect to login if no token found
    return <Navigate to="/login" replace />;
  }

  // If token exists, render the child routes
  return <Outlet />;
};

export default ProtectedRoute;
