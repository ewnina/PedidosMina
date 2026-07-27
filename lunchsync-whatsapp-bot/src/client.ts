import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import axios from 'axios';
import { BotInstance, BotStatus } from './types';

const STORAGE_PATH = process.env['STORAGE_PATH'] ?? path.join(process.cwd(), 'storage', 'whatsapp');

const instances = new Map<string, BotInstance>();
const mutexes = new Map<string, Promise<void>>();
const statusCallbacks = new Map<string, (status: BotStatus) => void>();
const qrCallbacks = new Map<string, (qr: string | null) => void>();

const LOCK_FILES = ['SingletonLock', 'SingletonSocket', 'SingletonCookie', 'DevToolsActivePort', 'DevToolsActivePort.lock'];

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

function cleanLockFiles(sessionDir: string): void {
  for (const file of LOCK_FILES) {
    const lockPath = path.join(sessionDir, file);
    try {
      if (fs.existsSync(lockPath)) {
        fs.unlinkSync(lockPath);
      }
    } catch {
      // ignore
    }
  }
  // Also clean nested Default/ lockfiles that Chrome might leave
  const defaultDir = path.join(sessionDir, 'Default');
  if (fs.existsSync(defaultDir)) {
    for (const file of LOCK_FILES) {
      try {
        const p = path.join(defaultDir, file);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch { /* ignore */ }
    }
  }
}

function killOrphanedChromes(sessionDir: string): void {
  try {
    const raw = execSync(
      `wmic process where "name='chrome.exe' or name='chromium.exe'" get ProcessId,CommandLine /format:csv`,
      { encoding: 'utf-8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] },
    );
    const lines = raw.split('\n').filter((l) => l.includes(sessionDir));
    const pids = lines
      .map((l) => {
        const parts = l.trim().split(',');
        return parseInt(parts.at(-1) ?? '', 10);
      })
      .filter((n) => !isNaN(n));
    for (const pid of pids) {
      try {
        process.kill(pid, 'SIGTERM');
        console.log(`[WhatsApp] Killed orphaned Chrome PID ${pid}`);
      } catch { /* already dead */ }
    }
    if (pids.length > 0) {
      execSync('timeout /t 2 >nul 2>&1 || ping -n 3 127.0.0.1 >nul', { timeout: 5000, stdio: 'pipe' });
    }
  } catch {
    // wmic might fail — not fatal
  }
}

function withMutex<T>(providerId: string, fn: () => Promise<T>): Promise<T> {
  const prev = mutexes.get(providerId) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  mutexes.set(providerId, next.then(() => {}, () => {}));
  return next;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function destroyClient(client: Client): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const browser = (client as any).browser;
    if (browser && typeof browser === 'object' && typeof (browser as { close?: () => Promise<void> }).close === 'function') {
      await (browser as { close: () => Promise<void> }).close();
    }
  } catch { /* ignore */ }
  try {
    await client.destroy();
  } catch { /* ignore */ }
}

async function initializeWithRetry(client: Client, attempts = 2): Promise<void> {
  for (let i = 1; i <= attempts; i++) {
    try {
      await client.initialize();
      return;
    } catch (err) {
      if (i === attempts) throw err;
      console.warn(`[WhatsApp] Attempt ${i} failed, retrying in 3s...`, err);
      await delay(3000);
    }
  }
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

function createClient(providerId: string): Client {
  // dataPath is the parent dir; LocalAuth puts profile at {dataPath}/session-{clientId}
  return new Client({
    authStrategy: new LocalAuth({
      clientId: providerId,
      dataPath: STORAGE_PATH,
    }),
    puppeteer: {
      headless: 'shell',
      executablePath: process.env['CHROME_BIN'] || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-features=VizDisplayCompositor',
      ],
    },
  });
}

export async function startBot(providerId: string): Promise<BotStatus> {
  return withMutex(providerId, async () => {
    const existing = instances.get(providerId);
    if (existing?.status === 'connected' || existing?.status === 'starting') {
      return existing.status;
    }

    // LocalAuth with clientId puts profile at STORAGE_PATH/session-{providerId}
    const profileDir = path.join(STORAGE_PATH, `session-${providerId}`);
    ensureSessionDir(providerId);
    killOrphanedChromes(profileDir);
    cleanLockFiles(profileDir);

    console.log(`[WhatsApp] Starting bot: ${providerId}`);
    console.log(`[WhatsApp] Profile dir: ${profileDir}`);

    const client = createClient(providerId);

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
      console.log(`[WhatsApp] QR received: ${providerId}`);
    });

    client.on('ready', () => {
      instance.status = 'connected';
      instance.lastConnectedAt = new Date();
      instance.qrCode = null;
      statusCallbacks.get(providerId)?.('connected');
      qrCallbacks.get(providerId)?.(null);
      console.log(`[WhatsApp] Bot connected: ${providerId}`);
    });

    client.on('loading_screen', (percent: number, message: string) => {
      console.log(`[WhatsApp] Loading: ${providerId} - ${percent}% - ${message}`);
    });

    client.on('change_state', (state: string) => {
      console.log(`[WhatsApp] State change: ${providerId} -> ${state}`);
    });

    client.on('disconnected', (reason: string) => {
      instance.status = 'disconnected';
      instance.qrCode = null;
      statusCallbacks.get(providerId)?.('disconnected');
      console.log(`[WhatsApp] Bot disconnected: ${providerId} - ${reason}`);
    });

    client.on('auth_failure', (msg: string) => {
      instance.status = 'authentication_failed';
      statusCallbacks.get(providerId)?.('authentication_failed');
      console.log(`[WhatsApp] Auth failed: ${providerId} - ${msg}`);
    });

    client.on('error', (err: Error) => {
      console.error(`[WhatsApp] Error: ${providerId}`, err.message);
    });

    client.on('message', async (msg) => {

      const backendUrl = process.env['BACKEND_URL'] ?? 'http://localhost:3000';
      const botSecret = process.env['BOT_INTERNAL_SECRET'] ?? 'lunchsync-bot-internal';


      //
      try {
        const isGroup = msg.from.endsWith('@g.us');

        if (!isGroup) {
          return;
        }

        const body = msg.body.trim().toLowerCase();
        const validCommands = ['pedir', 'almuerzo', 'menu', 'ordenar'];

        if (body === 'keygroupid') {
          await msg.reply(`El ID de este grupo es: ${msg.from}`);

          const url = `${backendUrl}/bot/link-group`;
          console.log(url);

          try {
            const { data } = await axios.patch<{ success: boolean }>(
              url,
              { providerId, whatsappGroupId: msg.from },
              { headers: { 'x-bot-secret': botSecret }, timeout: 10_000 },
            );

            if (data.success) {
              await msg.reply('✅ Este grupo ha sido vinculado correctamente.');
            } else {
              await msg.reply('❌ Error al vincular el grupo.');
            }
          } catch (err) {
            const detail = axios.isAxiosError(err)
              ? `HTTP ${err.response?.status ?? 'N/A'}: ${JSON.stringify(err.response?.data ?? err.message)}`
              : err instanceof Error ? err.message : String(err);
            console.error(`[WhatsApp] Error linking group: ${detail}`);
            await msg.reply('❌ Error al vincular el grupo.');
          }

          return;
        }

        if (!validCommands.includes(body)) {
          return;
        }

        const id_grupo = msg.from;
        const id_user = msg.author;

        if (!id_user) {
          console.log(`[WhatsApp] No author found in message from group ${id_grupo}`);
          return;
        }

      

        console.log(`[WhatsApp] Command received: ${body} from author: ${id_user} in group: ${id_grupo}`);

        try {
          const { data } = await axios.post<{ link: string; userExists: boolean }>(
            `${backendUrl}/bot/magic-link`,
            { author: id_user, whatsappGroupId: id_grupo, providerId },
            { headers: { 'x-bot-secret': botSecret }, timeout: 10_000 },
          );

          // Send link PRIVATELY to the user (not in the group)
          await sendMessage(providerId, id_user, `¡Hola! Aquí tienes tu enlace de acceso:\n\n${data.link}\n\nEste enlace es válido por 10 horas.`);

          // Confirm in the group
          const confirmationMsg = data.userExists
            ? '✅ Se te envió un link de acceso.'
            : '📩 Se te envió un link privado. Completa tus datos para continuar.';
          await msg.reply(confirmationMsg);

          console.log(`[WhatsApp] Magic link sent to ${id_user} for provider ${providerId}`);
        } catch (sendError) {
          const errDetail = axios.isAxiosError(sendError)
            ? `HTTP ${sendError.response?.status ?? 'N/A'}: ${JSON.stringify(sendError.response?.data ?? sendError.message)}`
            : sendError instanceof Error ? sendError.message : String(sendError);
          console.error(`[WhatsApp] Error generating magic link for ${id_user}: ${errDetail}`);
          try {
            await msg.reply('⚠️ Error al procesar tu solicitud. Intenta de nuevo.');
          } catch { /* ignore */ }
        }

      } catch (err) {
        console.error(`[WhatsApp] Error handling message:`, err);
      }




    });


    try {
      await initializeWithRetry(client);
      console.log(`[WhatsApp] initialize() resolved: ${providerId}, status=${instance.status}`);
    } catch (error) {
      instance.status = 'disconnected';
      statusCallbacks.get(providerId)?.('disconnected');
      console.error(`[WhatsApp] Failed to start bot ${providerId}:`, error);
    }

    return instance.status;
  });
}

export async function stopBot(providerId: string): Promise<BotStatus> {
  const instance = instances.get(providerId);
  if (!instance) {
    return 'disconnected';
  }

  instances.delete(providerId);
  instance.client.removeAllListeners();

  await destroyClient(instance.client);
  await delay(1000);

  const profileDir = path.join(STORAGE_PATH, `session-${providerId}`);
  cleanLockFiles(profileDir);

  statusCallbacks.get(providerId)?.('stopped');
  console.log(`[WhatsApp] Bot stopped: ${providerId}`);
  return 'stopped';
}

export async function restartBot(providerId: string): Promise<BotStatus> {
  await stopBot(providerId);
  return startBot(providerId);
}

export async function unlinkBot(providerId: string): Promise<void> {
  await stopBot(providerId);
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
    await instance.client.sendMessage(recipient, message);
    console.log(`[WhatsApp] Message sent: ${providerId} -> ${recipient}`);
    return true;
  } catch (error) {
    const details = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error(`[WhatsApp] Failed to send message: ${providerId} ${recipient}`, details);
    return false;
  }
}

export async function sendMessageV2(
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
    const client = instance.client;

    // 1. CALCULAR TIEMPO INTELIGENTE (Segundos basados en la longitud del texto)
    // 250 caracteres por minuto = ~4.1 caracteres por segundo.
    // Ponemos un mínimo de 1.5 segundos y un máximo de 6 segundos para no saturar al usuario.
    const caracteresPorSegundo = 4.1;
    const tiempoEscrituraMs = Math.min(
      Math.max((message.length / caracteresPorSegundo) * 1000, 1500), 
      6000
    );

    // 2. ACTIVAR "ESCRIBIENDO..." DE FORMA SEGURA
    try {
      if (client.pupPage) {
        await client.sendPresenceAvailable();
        await client.pupPage.evaluate(async (chatId) => {
          if (window.Store?.Chat) {
            const chat = await window.Store.Chat.find(chatId);
            if (chat && typeof chat.sendStateTyping === 'function') {
              await chat.sendStateTyping();
            }
          }
        }, recipient);

        // 3. ESPERAR EL TIEMPO CALCULADO
        await new Promise((resolve) => setTimeout(resolve, tiempoEscrituraMs));
      }
    } catch (presenceError) {
      // Si falla la simulación visual por cambios de WhatsApp, el flujo no se detiene
      console.warn(`[WhatsApp] No se pudo simular escritura para ${recipient}, enviando directo.`);
    }

    // 4. ENVIAR EL MENSAJE
    await client.sendMessage(recipient, message);

    // 5. DESACTIVAR PRESENCIA
    try {
      if (client.pupPage) {
        await client.sendPresenceUnavailable();
      }
    } catch { /* ignore */ }

    console.log(`[WhatsApp] Message sent: ${providerId} -> ${recipient} (Simulado: ${(tiempoEscrituraMs / 1000).toFixed(1)}s)`);
    return true;
  } catch (error) {
    const details = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error(`[WhatsApp] Failed to send message: ${providerId} ${recipient}`, details);
    return false;
  }
}

