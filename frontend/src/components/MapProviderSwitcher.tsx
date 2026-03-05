import React from 'react';
import type { MapProvider, MapProviderConfig } from '../types';

export const MAP_PROVIDERS: MapProviderConfig[] = [
  {
    id: 'osm',
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    requiresKey: false,
  },
  {
    id: 'google_satellite',
    name: 'Google Satellite',
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '&copy; Google',
    requiresKey: false,
  },
  {
    id: 'google_roads',
    name: 'Google Roads',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google',
    requiresKey: false,
  },
  {
    id: 'mapbox_streets',
    name: 'Mapbox Streets',
    url: 'https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token={accessToken}',
    attribution: '&copy; <a href="https://www.mapbox.com/">Mapbox</a>',
    requiresKey: true,
    keyType: 'mapbox',
  },
];

interface Props {
  current: MapProvider;
  onChange: (provider: MapProvider) => void;
}

const MapProviderSwitcher: React.FC<Props> = ({ current, onChange }) => {
  return (
    <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-1">
      <select
        value={current}
        onChange={(e) => onChange(e.target.value as MapProvider)}
        className="text-sm px-3 py-2 border-0 rounded-md focus:outline-none bg-white text-gray-800 font-medium"
      >
        {MAP_PROVIDERS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}{p.requiresKey ? ' 🔑' : ''}
          </option>
        ))}
      </select>
    </div>
  );
};

export default MapProviderSwitcher;
