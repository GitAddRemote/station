// src/routes.tsx

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import LoginCredentials from './pages/LoginCredentials';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import ForcedPasswordChange from './pages/ForcedPasswordChange';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Inventory from './pages/Inventory';
import OrgInventory from './pages/OrgInventory';
import Contracts from './pages/Contracts';
import WorkOrders from './pages/WorkOrders';
import Fleet from './pages/Fleet';
import HumanResources from './pages/HumanResources';
import Members from './pages/Members';
import BusinessUnits from './pages/BusinessUnits';
import Treasury from './pages/Treasury';
import Refinery from './pages/Refinery';
import ProtectedRoute from './components/ProtectedRoute';

const AppRoutes = () => (
  <Router>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/login/credentials" element={<LoginCredentials />} />
      <Route path="/register" element={<Register />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/forced-password-change" element={<ForcedPasswordChange />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/org-inventory" element={<OrgInventory />} />
        <Route path="/contracts" element={<Contracts />} />
        <Route path="/work-orders" element={<WorkOrders />} />
        <Route path="/fleet" element={<Fleet />} />
        <Route path="/hr" element={<HumanResources />} />
        <Route path="/hr/members" element={<Members />} />
        <Route path="/hr/business-units" element={<BusinessUnits />} />
        <Route path="/treasury" element={<Treasury />} />
        <Route path="/refinery" element={<Refinery />} />
      </Route>
    </Routes>
  </Router>
);

export default AppRoutes;

// Ensure the file is treated as a module
export {};
