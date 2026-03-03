import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { deliveriesApi, driversApi } from '../services/api';
import type { Delivery, Driver } from '../types';
import RoutePanel from '../components/RoutePanel';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_transit: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

const driverIcon = new L.DivIcon({
  html: `<div style="background:#3b82f6;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:14px;">🚚</div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const deliveryIcon = new L.DivIcon({
  html: `<div style="background:#ef4444;width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

const StatCard: React.FC<{ title: string; value: number; color: string; icon: string }> = ({ title, value, color, icon }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      </div>
      <div className="text-3xl">{icon}</div>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([deliveriesApi.getAll(), driversApi.getAll()])
      .then(([dRes, drRes]) => {
        setDeliveries(dRes.data.deliveries ?? dRes.data);
        setDrivers(drRes.data.drivers ?? drRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: deliveries.length,
    pending: deliveries.filter((d) => d.status === 'pending').length,
    inTransit: deliveries.filter((d) => d.status === 'in_transit').length,
    delivered: deliveries.filter((d) => d.status === 'delivered').length,
    failed: deliveries.filter((d) => d.status === 'failed').length,
    activeDrivers: drivers.filter((d) => d.status === 'active' || d.status === 'on_delivery').length,
  };

  const recentDeliveries = [...deliveries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  const driversWithLocation = drivers.filter((d) => d.lat !== null && d.lng !== null);
  const deliveriesWithLocation = deliveries.filter((d) => d.lat !== null && d.lng !== null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Logistics overview at a glance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Total Deliveries" value={stats.total} color="text-gray-900" icon="📦" />
        <StatCard title="Active Drivers" value={stats.activeDrivers} color="text-blue-600" icon="🚚" />
        <StatCard title="Pending" value={stats.pending} color="text-yellow-600" icon="⏳" />
        <StatCard title="In Transit" value={stats.inTransit} color="text-blue-600" icon="🛣️" />
        <StatCard title="Delivered" value={stats.delivered} color="text-green-600" icon="✅" />
        <StatCard title="Failed" value={stats.failed} color="text-red-600" icon="❌" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Map Preview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Live Map Preview</h2>
            <Link to="/map" className="text-sm text-blue-600 hover:text-blue-700 font-medium">View Full Map →</Link>
          </div>
          <div className="h-64">
            <MapContainer center={[51.505, -0.09]} zoom={5} style={{ height: '100%', width: '100%' }} zoomControl={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {driversWithLocation.map((driver) => (
                <Marker key={driver.id} position={[driver.lat!, driver.lng!]} icon={driverIcon}>
                  <Popup><strong>{driver.name}</strong><br />Status: {driver.status}</Popup>
                </Marker>
              ))}
              {deliveriesWithLocation.map((delivery) => (
                <Marker key={delivery.id} position={[delivery.lat!, delivery.lng!]} icon={deliveryIcon}>
                  <Popup><strong>{delivery.trackingNumber}</strong><br />{delivery.recipient}</Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Recent Deliveries */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Deliveries</h2>
            <Link to="/deliveries" className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentDeliveries.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No deliveries yet</div>
            ) : (
              recentDeliveries.map((delivery) => (
                <div key={delivery.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{delivery.trackingNumber}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{delivery.recipient}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[delivery.status]}`}>
                    {delivery.status.replace('_', ' ')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* AI Route Optimizer */}
      <RoutePanel />
    </div>
  );
};

export default Dashboard;
