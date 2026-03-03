import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['admin', 'dispatcher'] },
  { path: '/map', label: 'Map', icon: '🗺️', roles: ['admin', 'dispatcher', 'driver'] },
  { path: '/deliveries', label: 'Deliveries', icon: '📦', roles: ['admin', 'dispatcher'] },
  { path: '/drivers', label: 'Drivers', icon: '🚚', roles: ['admin'] },
  { path: '/audit', label: 'Audit Chain', icon: '🔗', roles: ['admin', 'dispatcher'] },
  { path: '/users', label: 'Users', icon: '👥', roles: ['admin'] },
];

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-500',
  dispatcher: 'bg-blue-500',
  driver: 'bg-green-500',
};

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col w-64 bg-[#1e293b] text-white h-screen fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-lg">🚛</div>
        <div>
          <div className="font-bold text-lg leading-tight">LogiTrack</div>
          <div className="text-xs text-slate-400">Logistics Platform</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-slate-700 p-4 space-y-3">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`
          }
        >
          <span className="text-lg">⚙️</span>
          Settings
        </NavLink>

        <div className="flex items-center gap-3 px-4 py-2">
          <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-sm font-bold">
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user.name}</div>
            <span className={`text-xs px-2 py-0.5 rounded-full text-white ${ROLE_COLORS[user.role] || 'bg-slate-500'}`}>
              {user.role}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-slate-300 hover:bg-red-600 hover:text-white transition-colors text-sm font-medium"
        >
          <span>🚪</span>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
