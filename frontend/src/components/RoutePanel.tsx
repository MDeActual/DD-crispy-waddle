import React, { useEffect, useState } from 'react';
import { routesApi } from '../services/api';
import { onRouteUpdate, offRouteUpdate } from '../services/socket';
import type { OptimizedRoutes } from '../types';

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  on_delivery: 'bg-blue-100 text-blue-700',
  incident: 'bg-red-100 text-red-700',
  inactive: 'bg-gray-100 text-gray-500',
};

const RoutePanel: React.FC = () => {
  const [routes, setRoutes] = useState<OptimizedRoutes>({});
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [lastOptimized, setLastOptimized] = useState<string | null>(null);

  const loadRoutes = () => {
    routesApi
      .getRoutes()
      .then((r) => setRoutes(r.data.routes))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRoutes();
    onRouteUpdate(({ routes: updated }) => {
      setRoutes(updated);
      setLastOptimized(new Date().toLocaleTimeString());
    });
    return () => offRouteUpdate();
  }, []);

  const handleOptimize = async () => {
    setOptimizing(true);
    try {
      const res = await routesApi.optimize();
      setRoutes(res.data.routes);
      setLastOptimized(new Date().toLocaleTimeString());
    } catch (err) {
      console.error(err);
    } finally {
      setOptimizing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-sm text-gray-500 animate-pulse">Loading AI routes…</div>
    );
  }

  const entries = Object.values(routes);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">AI Route Optimizer</h2>
            {lastOptimized && (
              <p className="text-xs text-gray-400">Last optimised: {lastOptimized}</p>
            )}
          </div>
        </div>
        <button
          onClick={handleOptimize}
          disabled={optimizing}
          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors"
        >
          {optimizing ? '⏳ Optimizing…' : '⚡ Re-optimize'}
        </button>
      </div>

      {/* Driver route cards */}
      <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
        {entries.length === 0 ? (
          <p className="p-6 text-center text-gray-400 text-sm">No drivers found</p>
        ) : (
          entries.map(({ driver, orderedDeliveries, totalDistanceKm }) => (
            <div key={driver.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">🚚</span>
                  <span className="font-medium text-gray-800 text-sm">{driver.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[driver.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {driver.status}
                  </span>
                </div>
                <span className="text-xs text-gray-400 font-mono">
                  {orderedDeliveries.length} stops · {totalDistanceKm} km
                </span>
              </div>

              {orderedDeliveries.length === 0 ? (
                <p className="text-xs text-gray-400 pl-6">No pending deliveries</p>
              ) : (
                <ol className="space-y-1 pl-6">
                  {orderedDeliveries.map((delivery, idx) => (
                    <li key={delivery.id} className="flex items-start gap-2 text-xs">
                      <span className="font-mono text-indigo-500 w-4 shrink-0">{idx + 1}.</span>
                      <div className="min-w-0">
                        <span className="font-medium text-gray-700">{delivery.trackingNumber}</span>
                        <span className="text-gray-400 ml-1 truncate">— {delivery.recipient}</span>
                        {delivery.distanceFromPrevKm !== undefined && (
                          <span className="ml-1 text-gray-300">({delivery.distanceFromPrevKm} km)</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RoutePanel;
