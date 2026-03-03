import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { useLocation } from 'react-router-dom';
import L from 'leaflet';
import { deliveriesApi, driversApi, routesApi } from '../services/api';
import type { Delivery, Driver, MapProvider, OptimizedRoutes } from '../types';
import { onLocationUpdate, offLocationUpdate, onDeliveryUpdate, offDeliveryUpdate, onRouteUpdate, offRouteUpdate, onDriverIncident, offDriverIncident } from '../services/socket';
import MapProviderSwitcher, { MAP_PROVIDERS } from '../components/MapProviderSwitcher';
import RoutePanel from '../components/RoutePanel';
import { useAuth } from '../contexts/AuthContext';

const driverIcon = new L.DivIcon({
  html: `<div style="background:#3b82f6;width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:16px;">🚚</div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const incidentIcon = new L.DivIcon({
  html: `<div style="background:#ef4444;width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:16px;">⚠️</div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const deliveryIcon = new L.DivIcon({
  html: `<div style="background:#ef4444;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

// Route polyline colours per driver slot
const ROUTE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#14b8a6'];

const FlyToLocation: React.FC<{ location: [number, number] | null }> = ({ location }) => {
  const map = useMap();
  useEffect(() => {
    if (location) map.flyTo(location, 14);
  }, [location, map]);
  return null;
};

const MapPage: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [routes, setRoutes] = useState<OptimizedRoutes>({});
  const [mapProvider, setMapProvider] = useState<MapProvider>('osm');
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [incidentNotice, setIncidentNotice] = useState<string | null>(null);
  const [reportingIncident, setReportingIncident] = useState(false);
  const mapboxKey = localStorage.getItem('mapbox_key') || '';

  // Support navigation from DriversPage: /map?lat=xx&lng=yy
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const lat = parseFloat(params.get('lat') || '');
    const lng = parseFloat(params.get('lng') || '');
    if (!isNaN(lat) && !isNaN(lng)) setFlyTo([lat, lng]);
  }, [location.search]);

  useEffect(() => {
    driversApi.getAll().then((r) => setDrivers(r.data.drivers ?? r.data)).catch(console.error);
    deliveriesApi.getAll().then((r) => setDeliveries(r.data.deliveries ?? r.data)).catch(console.error);
    if (user?.role !== 'driver') {
      routesApi.getRoutes().then((r) => setRoutes(r.data.routes)).catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    onLocationUpdate((data) => {
      setDrivers((prev) =>
        prev.map((d) =>
          d.id === data.driverId ? { ...d, lat: data.lat, lng: data.lng, lastUpdate: data.timestamp } : d
        )
      );
    });
    onDeliveryUpdate((updated) => {
      setDeliveries((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    });
    onRouteUpdate(({ routes: updated }) => setRoutes(updated));
    onDriverIncident(({ driver, reason, reassignments }) => {
      setIncidentNotice(`⚠️ ${driver.name} reported: ${reason}. ${reassignments.length} deliveries re-assigned.`);
      setTimeout(() => setIncidentNotice(null), 8000);
    });
    return () => {
      offLocationUpdate();
      offDeliveryUpdate();
      offRouteUpdate();
      offDriverIncident();
    };
  }, []);

  const handleReportIncident = useCallback(async () => {
    if (!user || user.role !== 'driver') return;
    const ownDriver = drivers.find((d) => d.userId === user.id);
    if (!ownDriver) return;
    setReportingIncident(true);
    try {
      await driversApi.reportIncident(ownDriver.id, 'flat_tyre');
      setIncidentNotice('Incident reported. Dispatcher has been notified and deliveries are being re-assigned.');
    } catch {
      setIncidentNotice('Failed to report incident. Please call dispatch directly.');
    } finally {
      setReportingIncident(false);
      setTimeout(() => setIncidentNotice(null), 8000);
    }
  }, [user, drivers]);

  const providerConfig = MAP_PROVIDERS.find((p) => p.id === mapProvider)!;
  const tileUrl = mapProvider === 'mapbox_streets' ? providerConfig.url.replace('{accessToken}', mapboxKey) : providerConfig.url;

  const driversWithLocation = drivers.filter((d) => d.lat !== null && d.lng !== null);
  const deliveriesWithLocation = deliveries.filter((d) => d.lat !== null && d.lng !== null);

  // Build polylines: driver → ordered delivery stops
  const routePolylines = showRoutes
    ? Object.values(routes).flatMap((entry, driverIdx) => {
        if (!entry.driver.lat || !entry.driver.lng || entry.orderedDeliveries.length === 0) return [];
        const points: [number, number][] = [
          [entry.driver.lat, entry.driver.lng],
          ...entry.orderedDeliveries
            .filter((d) => d.lat !== null && d.lng !== null)
            .map((d) => [d.lat!, d.lng!] as [number, number]),
        ];
        return [{ points, color: ROUTE_COLORS[driverIdx % ROUTE_COLORS.length] }];
      })
    : [];

  const isAdmin = user?.role === 'admin' || user?.role === 'dispatcher';
  const isDriver = user?.role === 'driver';

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-bold text-gray-900">Live Map</h1>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 bg-blue-500 rounded-full inline-block" /> Drivers ({driversWithLocation.length})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 bg-red-500 rounded-full inline-block" /> Deliveries ({deliveriesWithLocation.length})
            </span>
          </div>

          {isAdmin && (
            <>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showRoutes}
                  onChange={(e) => setShowRoutes(e.target.checked)}
                  className="rounded"
                />
                <span className="text-gray-700">AI Routes</span>
              </label>
              <button
                onClick={() => setShowPanel(!showPanel)}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700"
              >
                🤖 {showPanel ? 'Hide' : 'Show'} Route Panel
              </button>
            </>
          )}

          {isDriver && (
            <button
              onClick={handleReportIncident}
              disabled={reportingIncident}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:bg-red-300"
            >
              {reportingIncident ? '⏳ Reporting…' : '⚠️ Report Incident'}
            </button>
          )}
        </div>
      </div>

      {/* Incident notice */}
      {incidentNotice && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-amber-800 text-sm flex items-center gap-2">
          <span>{incidentNotice}</span>
          <button onClick={() => setIncidentNotice(null)} className="ml-auto text-amber-500 hover:text-amber-700">✕</button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer center={[37.78, -122.41]} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer url={tileUrl} attribution={providerConfig.attribution} />
            <FlyToLocation location={flyTo} />

            {/* Route polylines */}
            {routePolylines.map((line, idx) => (
              <Polyline key={idx} positions={line.points} pathOptions={{ color: line.color, weight: 3, opacity: 0.7, dashArray: '6 4' }} />
            ))}

            {/* Driver markers */}
            {driversWithLocation.map((driver) => (
              <Marker
                key={driver.id}
                position={[driver.lat!, driver.lng!]}
                icon={driver.status === 'incident' ? incidentIcon : driverIcon}
              >
                <Popup>
                  <div className="font-semibold">{driver.name}</div>
                  <div className="text-sm text-gray-600">Status: {driver.status}</div>
                  {driver.lastUpdate && (
                    <div className="text-xs text-gray-400 mt-1">
                      Last update: {new Date(driver.lastUpdate).toLocaleTimeString()}
                    </div>
                  )}
                </Popup>
              </Marker>
            ))}

            {/* Delivery markers */}
            {deliveriesWithLocation.map((delivery) => (
              <Marker key={delivery.id} position={[delivery.lat!, delivery.lng!]} icon={deliveryIcon}>
                <Popup>
                  <div className="font-semibold">{delivery.trackingNumber}</div>
                  <div className="text-sm text-gray-600">{delivery.recipient}</div>
                  <div className="text-sm text-gray-500">{delivery.address}</div>
                  <div className="text-xs mt-1 font-medium capitalize">{delivery.status.replace('_', ' ')}</div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          <MapProviderSwitcher current={mapProvider} onChange={setMapProvider} />

          {mapProvider === 'mapbox_streets' && !mapboxKey && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-2 rounded-lg text-sm shadow">
              ⚠️ Mapbox API key required. Add it in Settings.
            </div>
          )}
        </div>

        {/* Route Panel sidebar */}
        {showPanel && isAdmin && (
          <div className="w-80 border-l border-gray-200 bg-gray-50 overflow-y-auto p-3">
            <RoutePanel />
          </div>
        )}
      </div>
    </div>
  );
};

export default MapPage;
