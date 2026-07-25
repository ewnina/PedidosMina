import type { Client } from 'whatsapp-web.js';

export type BotStatus = 'disconnected' | 'starting' | 'waiting_qr' | 'connected' | 'reconnecting' | 'authentication_failed' | 'stopped';

export interface BotInstance {
  providerId: string;
  status: BotStatus;
  client: Client;
  qrCode: string | null;
  lastConnectedAt: Date | null;
}

export interface StartBotRequest {
  providerId: string;
}

export interface SendMessageRequest {
  providerId: string;
  recipient: string;
  message: string;
}

export interface BotStatusResponse {
  providerId: string;
  status: BotStatus;
  lastConnectedAt: string | null;
}

export interface QrResponse {
  providerId: string;
  qrCode: string | null;
}
