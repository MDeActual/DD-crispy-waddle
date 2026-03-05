import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/MapPage';
import DeliveriesPage from './pages/DeliveriesPage';
import DriversPage from './pages/DriversPage';
import SettingsPage from './pages/SettingsPage';
import AuditPage from './pages/AuditPage';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="ml-64 flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

const RootRedirect: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'driver') return <Navigate to="/map" replace />;
  return <Navigate to="/dashboard" replace />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RootRedirect />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={['admin', 'dispatcher']}>
                <AppLayout><Dashboard /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/map"
            element={
              <ProtectedRoute>
                <AppLayout><MapPage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/deliveries"
            element={
              <ProtectedRoute roles={['admin', 'dispatcher']}>
                <AppLayout><DeliveriesPage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/drivers"
            element={
              <ProtectedRoute roles={['admin']}>
                <AppLayout><DriversPage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <AppLayout><SettingsPage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit"
            element={
              <ProtectedRoute roles={['admin', 'dispatcher']}>
                <AppLayout><AuditPage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
