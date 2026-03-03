export type UserRole = 'admin' | 'dispatcher' | 'driver';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Driver {
  id: string;
  userId: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'on_delivery' | 'incident';
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
  distanceFromPrevKm?: number;
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

// ─── AI Route Optimization ──────────────────────────────────────────────────

export interface RouteEntry {
  driver: Pick<Driver, 'id' | 'name' | 'status' | 'lat' | 'lng'>;
  orderedDeliveries: Delivery[];
  totalDistanceKm: number;
}

export type OptimizedRoutes = Record<string, RouteEntry>;

export interface OptimizeResult {
  message: string;
  assignments: Array<{
    deliveryId: string;
    driverId: string;
    distanceKm: number;
  }>;
  routes: OptimizedRoutes;
}

// ─── Blockchain Audit ──────────────────────────────────────────────────────

export interface AuditBlock {
  index: number;
  timestamp: string;
  eventType: string;
  data: Record<string, unknown>;
  previousHash: string;
  hash: string;
}

// ─── Driver Incident ──────────────────────────────────────────────────────

export interface IncidentResult {
  message: string;
  driver: Driver;
  reassignments: Array<{
    deliveryId: string;
    previousDriverId: string;
    newDriverId: string | null;
    distanceKm?: number;
    reason: string;
  }>;
  routes: OptimizedRoutes;
}
