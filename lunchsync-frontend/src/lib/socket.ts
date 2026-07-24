import { io, type Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const WS_URL = import.meta.env.VITE_API_WS_URL ?? API_URL;

export const menuSocket: Socket = io(`${WS_URL}/realtime`, {
  autoConnect: false,
});

export const whatsappSocket: Socket = io(`${WS_URL}/whatsapp`, {
  autoConnect: false,
});

export function connectMenuSocket(dailyMenuId: string): Socket {
  const socket = io(`${WS_URL}/realtime`, {
    query: { dailyMenuId },
  });
  return socket;
}

export function connectWhatsappSocket(providerId: string): Socket {
  const socket = io(`${WS_URL}/whatsapp`, {
    query: { providerId },
  });
  return socket;
}