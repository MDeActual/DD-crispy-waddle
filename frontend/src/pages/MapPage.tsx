import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { deliveriesApi, driversApi } from '../services/api';
import type { Delivery, Driver, MapProvider } from '../types';
import { onLocationUpdate, offLocationUpdate, onDeliveryUpdate, offDeliveryUpdate } from '../services/socket';
import MapProviderSwitcher, { MAP_PROVIDERS } from '../components/MapProviderSwitcher';

const driverIcon = new L.DivIcon({
  html: `<div style="background:#3b82f6;width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:16px;">🚚</div>`,
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

const FlyToLocation: React.FC<{ location: [number, number] | null }> = ({ location }) => {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.flyTo(location, 14);
    }
  }, [location, map]);
  return null;
};

const MapPage: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [mapProvider, setMapProvider] = useState<MapProvider>('osm');
  const [flyTo] = useState<[number, number] | null>(null);
  const mapboxKey = localStorage.getItem('mapbox_key') || '';

  useEffect(() => {
    driversApi.getAll().then((r) => setDrivers(r.data)).catch(console.error);
    deliveriesApi.getAll().then((r) => setDeliveries(r.data)).catch(console.error);
  }, []);

  useEffect(() => {
    onLocationUpdate((data) => {
      setDrivers((prev) =>
        prev.map((d) =>
          d.id === data.driverId
            ? { ...d, lat: data.lat, lng: data.lng, lastUpdate: data.timestamp }
            : d
        )
      );
    });
    onDeliveryUpdate((updated) => {
      setDeliveries((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    });
    return () => {
      offLocationUpdate();
      offDeliveryUpdate();
    };
  }, []);

  const providerConfig = MAP_PROVIDERS.find((p) => p.id === mapProvider)!;
  const tileUrl = mapProvider === 'mapbox_streets' ? providerConfig.url.replace('{accessToken}', mapboxKey) : providerConfig.url;

  const driversWithLocation = drivers.filter((d) => d.lat !== null && d.lng !== null);
  const deliveriesWithLocation = deliveries.filter((d) => d.lat !== null && d.lng !== null);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Live Map</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 bg-blue-500 rounded-full inline-block"></span> Drivers ({driversWithLocation.length})</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 bg-red-500 rounded-full inline-block"></span> Deliveries ({deliveriesWithLocation.length})</span>
          </div>
        </div>
      </div>
      <div className="flex-1 relative">
        <MapContainer center={[51.505, -0.09]} zoom={5} style={{ height: '100%', width: '100%' }}>
          <TileLayer url={tileUrl} attribution={providerConfig.attribution} />
          <FlyToLocation location={flyTo} />
          {driversWithLocation.map((driver) => (
            <Marker key={driver.id} position={[driver.lat!, driver.lng!]} icon={driverIcon}>
              <Popup>
                <div className="font-semibold">{driver.name}</div>
                <div className="text-sm text-gray-600">Status: {driver.status}</div>
                {driver.lastUpdate && (
                  <div className="text-xs text-gray-400 mt-1">Last update: {new Date(driver.lastUpdate).toLocaleTimeString()}</div>
                )}
              </Popup>
            </Marker>
          ))}
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
    </div>
  );
};

export default MapPage;
