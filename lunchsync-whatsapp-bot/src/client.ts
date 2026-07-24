import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { BotInstance, BotStatus } from './types';

const STORAGE_PATH = process.env['STORAGE_PATH'] ?? path.join(process.cwd(), 'storage', 'whatsapp');

const instances = new Map<string, BotInstance>();
const statusCallbacks = new Map<string, (status: BotStatus) => void>();
const qrCallbacks = new Map<string, (qr: string | null) => void>();

function getSessionDir(providerId: string): string {
  return path.join(STORAGE_PATH, providerId);
}

function ensureSessionDir(providerId: string): string {
  const dir = getSessionDir(providerId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getBotInstance(providerId: string): BotInstance | undefined {
  return instances.get(providerId);
}

export function getAllInstances(): BotInstance[] {
  return Array.from(instances.values());
}

export function onStatusChange(providerId: string, callback: (status: BotStatus) => void): void {
  statusCallbacks.set(providerId, callback);
}

export function onQrGenerated(providerId: string, callback: (qr: string | null) => void): void {
  qrCallbacks.set(providerId, callback);
}

export async function startBot(providerId: string): Promise<BotStatus> {
  const existing = instances.get(providerId);
  if (existing?.status === 'connected' || existing?.status === 'starting') {
    return existing.status;
  }

  const sessionDir = ensureSessionDir(providerId);

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: providerId, dataPath: sessionDir }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--single-process',
      ],
    },
  });

  const instance: BotInstance = {
    providerId,
    status: 'starting',
    client,
    qrCode: null,
    lastConnectedAt: null,
  };

  instances.set(providerId, instance);
  statusCallbacks.get(providerId)?.('starting');

  client.on('qr', async (qr) => {
    const qrDataUrl = await qrcode.toDataURL(qr);
    instance.qrCode = qrDataUrl;
    instance.status = 'waiting_qr';
    statusCallbacks.get(providerId)?.('waiting_qr');
    qrCallbacks.get(providerId)?.(qrDataUrl);
  });

  client.on('ready', () => {
    instance.status = 'connected';
    instance.lastConnectedAt = new Date();
    instance.qrCode = null;
    statusCallbacks.get(providerId)?.('connected');
    qrCallbacks.get(providerId)?.(null);
    console.log(`[WhatsApp] Bot connected: ${providerId}`);
  });

  client.on('disconnected', (reason) => {
    instance.status = 'disconnected';
    instance.qrCode = null;
    statusCallbacks.get(providerId)?.('disconnected');
    console.log(`[WhatsApp] Bot disconnected: ${providerId} - ${reason}`);
  });

  client.on('auth_failure', () => {
    instance.status = 'authentication_failed';
    statusCallbacks.get(providerId)?.('authentication_failed');
    console.log(`[WhatsApp] Auth failed: ${providerId}`);
  });

  try {
    await client.initialize();
  } catch (error) {
    instance.status = 'disconnected';
    statusCallbacks.get(providerId)?.('disconnected');
    console.error(`[WhatsApp] Failed to start bot ${providerId}:`, error);
  }

  return instance.status;
}

export function stopBot(providerId: string): BotStatus {
  const instance = instances.get(providerId);
  if (!instance) {
    return 'disconnected';
  }

  instance.client.destroy?.();
  instance.status = 'stopped';
  statusCallbacks.get(providerId)?.('stopped');
  instances.delete(providerId);

  console.log(`[WhatsApp] Bot stopped: ${providerId}`);
  return 'stopped';
}

export function restartBot(providerId: string): BotStatus {
  stopBot(providerId);
  void startBot(providerId);
  return 'starting';
}

export function unlinkBot(providerId: string): void {
  stopBot(providerId);
  const sessionDir = getSessionDir(providerId);
  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true });
    console.log(`[WhatsApp] Session deleted: ${providerId}`);
  }
}

export async function sendMessage(
  providerId: string,
  recipient: string,
  message: string,
): Promise<boolean> {
  const instance = instances.get(providerId);
  if (!instance || instance.status !== 'connected') {
    console.error(`[WhatsApp] Cannot send message - bot not connected: ${providerId}`);
    return false;
  }

  try {
    await (instance.client as { sendMessage: (chatId: string, msg: string) => Promise<unknown> }).sendMessage(recipient, message);
    console.log(`[WhatsApp] Message sent: ${providerId} -> ${recipient}`);
    return true;
  } catch (error) {
    console.error(`[WhatsApp] Failed to send message: ${providerId}`, error);
    return false;
  }
}
