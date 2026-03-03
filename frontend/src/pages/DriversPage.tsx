import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { driversApi } from '../services/api';
import type { Driver } from '../types';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  on_delivery: 'bg-blue-100 text-blue-800',
};

const DriversPage: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    driversApi.getAll()
      .then((r) => setDrivers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
        <p className="text-gray-500 mt-1">{drivers.length} total drivers • {drivers.filter(d => d.status !== 'inactive').length} active</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-green-600">{drivers.filter(d => d.status === 'active').length}</div>
          <div className="text-sm text-gray-500 mt-1">Available</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-blue-600">{drivers.filter(d => d.status === 'on_delivery').length}</div>
          <div className="text-sm text-gray-500 mt-1">On Delivery</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-gray-600">{drivers.filter(d => d.status === 'inactive').length}</div>
          <div className="text-sm text-gray-500 mt-1">Inactive</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Last Location</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Last Update</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {drivers.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No drivers found</td></tr>
            ) : (
              drivers.map((driver) => (
                <tr key={driver.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{driver.name}</td>
                  <td className="px-4 py-3 text-gray-500">{driver.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[driver.status] || 'bg-gray-100 text-gray-800'}`}>
                      {driver.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    {driver.lat !== null && driver.lng !== null
                      ? `${driver.lat.toFixed(4)}, ${driver.lng.toFixed(4)}`
                      : <span className="text-gray-300">N/A</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {driver.lastUpdate ? new Date(driver.lastUpdate).toLocaleString() : <span className="text-gray-300">Never</span>}
                  </td>
                  <td className="px-4 py-3">
                    {driver.lat !== null && driver.lng !== null && (
                      <Link to={`/map?lat=${driver.lat}&lng=${driver.lng}`} className="text-blue-600 hover:text-blue-700 font-medium text-xs">
                        View on Map
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DriversPage;
