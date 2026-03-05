import React, { useEffect, useState } from 'react';
import { deliveriesApi, driversApi } from '../services/api';
import type { Delivery, Driver } from '../types';
import { useAuth } from '../contexts/AuthContext';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  in_transit: 'bg-blue-100 text-blue-800 border-blue-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
};

const STATUSES = ['pending', 'in_transit', 'delivered', 'failed'];

interface DeliveryFormData {
  recipient: string;
  address: string;
  driverId: string;
  status: string;
  lat: string;
  lng: string;
}

const defaultForm: DeliveryFormData = { recipient: '', address: '', driverId: '', status: 'pending', lat: '', lng: '' };

const DeliveriesPage: React.FC = () => {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editDelivery, setEditDelivery] = useState<Delivery | null>(null);
  const [form, setForm] = useState<DeliveryFormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadData = () => {
    Promise.all([deliveriesApi.getAll(), driversApi.getAll()])
      .then(([dRes, drRes]) => {
        setDeliveries(dRes.data.deliveries ?? dRes.data);
        setDrivers(drRes.data.drivers ?? drRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const openNew = () => {
    setEditDelivery(null);
    setForm(defaultForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (delivery: Delivery) => {
    setEditDelivery(delivery);
    setForm({
      recipient: delivery.recipient,
      address: delivery.address,
      driverId: delivery.driverId || '',
      status: delivery.status,
      lat: delivery.lat?.toString() || '',
      lng: delivery.lng?.toString() || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        recipient: form.recipient,
        address: form.address,
        driverId: form.driverId || null,
        status: form.status,
        lat: form.lat ? parseFloat(form.lat) : null,
        lng: form.lng ? parseFloat(form.lng) : null,
      };
      if (editDelivery) {
        await deliveriesApi.update(editDelivery.id, payload);
      } else {
        await deliveriesApi.create(payload);
      }
      setShowModal(false);
      loadData();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const canCreate = user?.role === 'admin' || user?.role === 'dispatcher';

  if (loading) return <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deliveries</h1>
          <p className="text-gray-500 mt-1">{deliveries.length} total deliveries</p>
        </div>
        {canCreate && (
          <button onClick={openNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center gap-2">
            + New Delivery
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Tracking #</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Recipient</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Address</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Driver</th>
                {canCreate && <th className="px-4 py-3 text-left font-semibold text-gray-600">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {deliveries.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No deliveries found</td></tr>
              ) : (
                deliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-gray-900">{delivery.trackingNumber}</td>
                    <td className="px-4 py-3 text-gray-700">{delivery.recipient}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{delivery.address}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[delivery.status]}`}>
                        {delivery.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{delivery.driverName || <span className="text-gray-400 italic">Unassigned</span>}</td>
                    {canCreate && (
                      <td className="px-4 py-3">
                        <button onClick={() => openEdit(delivery)} className="text-blue-600 hover:text-blue-700 font-medium text-xs">Edit</button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{editDelivery ? 'Edit Delivery' : 'New Delivery'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Name</label>
                <input type="text" value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
                <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Latitude (optional)</label>
                  <input type="number" step="any" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Longitude (optional)</label>
                  <input type="number" step="any" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Driver</label>
                <select value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
                  <option value="">-- Unassigned --</option>
                  {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              {editDelivery && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 font-medium">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveriesPage;
