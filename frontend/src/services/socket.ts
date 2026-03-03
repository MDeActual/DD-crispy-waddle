import { io, Socket } from 'socket.io-client';
import type { Delivery } from '../types';

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

export const offLocationUpdate = () => {
  socket?.off('location_update');
};

export const offDeliveryUpdate = () => {
  socket?.off('delivery_update');
};

export const getSocket = () => socket;
