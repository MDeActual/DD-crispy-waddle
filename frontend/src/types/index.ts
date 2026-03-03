export type UserRole = 'admin' | 'dispatcher' | 'driver';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'on_delivery';
  lat: number | null;
  lng: number | null;
  lastUpdate: string | null;
}

export type DeliveryStatus = 'pending' | 'in_transit' | 'delivered' | 'failed';

export interface Delivery {
  id: string;
  trackingNumber: string;
  recipient: string;
  address: string;
  status: DeliveryStatus;
  driverId: string | null;
  driverName: string | null;
  lat: number | null;
  lng: number | null;
  createdAt: string;
  updatedAt: string;
}

export type MapProvider = 'osm' | 'google_satellite' | 'google_roads' | 'mapbox_streets';

export interface MapProviderConfig {
  id: MapProvider;
  name: string;
  url: string;
  attribution: string;
  requiresKey: boolean;
  keyType?: 'google' | 'mapbox';
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  mfaRequired: boolean;
  preAuthToken: string | null;
}
