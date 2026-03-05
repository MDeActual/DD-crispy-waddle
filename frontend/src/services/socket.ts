import { io, Socket } from 'socket.io-client';
import type { Delivery, OptimizedRoutes } from '../types';

let socket: Socket | null = null;

export const connectSocket = (token: string): Socket => {
  if (socket?.connected) return socket;

  socket = io('/', {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const onLocationUpdate = (callback: (data: { driverId: string; lat: number; lng: number; timestamp: string }) => void) => {
  socket?.on('location_update', callback);
};

export const onDeliveryUpdate = (callback: (data: Delivery) => void) => {
  socket?.on('delivery_update', callback);
};

export const onRouteUpdate = (callback: (data: { routes: OptimizedRoutes }) => void) => {
  socket?.on('route_update', callback);
};

export const onDriverIncident = (callback: (data: { driver: { id: string; name: string }; reason: string; reassignments: unknown[] }) => void) => {
  socket?.on('driver_incident', callback);
};

export const offLocationUpdate = () => { socket?.off('location_update'); };
export const offDeliveryUpdate = () => { socket?.off('delivery_update'); };
export const offRouteUpdate = () => { socket?.off('route_update'); };
export const offDriverIncident = () => { socket?.off('driver_incident'); };

export const getSocket = () => socket;
