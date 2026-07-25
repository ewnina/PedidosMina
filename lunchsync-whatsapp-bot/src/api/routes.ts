import { Router, Request, Response } from 'express';
import {
  startBot,
  stopBot,
  restartBot,
  unlinkBot,
  getBotInstance,
  getAllInstances,
  sendMessage,
} from '../client';
import { BotStatusResponse, QrResponse } from '../types';

const router = Router();

const BOT_INTERNAL_SECRET = process.env['BOT_INTERNAL_SECRET'] ?? 'lunchsync-bot-internal';

router.get('/status/:providerId', (req: Request, res: Response) => {
  const providerId = req.params['providerId'] as string;
  const instance = getBotInstance(providerId);
  const response: BotStatusResponse = {
    providerId,
    status: instance?.status ?? 'disconnected',
    lastConnectedAt: instance?.lastConnectedAt?.toISOString() ?? null,
  };
  res.json(response);
});

router.get('/status', (_req: Request, res: Response) => {
  const instances = getAllInstances();
  res.json(instances.map((i) => ({
    providerId: i.providerId,
    status: i.status,
    lastConnectedAt: i.lastConnectedAt?.toISOString() ?? null,
  })));
});

router.post('/start/:providerId', async (req: Request, res: Response) => {
  const providerId = req.params['providerId'] as string;
  const status = await startBot(providerId);
  res.json({ providerId, status });
});

router.post('/stop/:providerId', async (req: Request, res: Response) => {
  const providerId = req.params['providerId'] as string;
  const status = await stopBot(providerId);
  res.json({ providerId, status });
});

router.post('/restart/:providerId', async (req: Request, res: Response) => {
  const providerId = req.params['providerId'] as string;
  const status = await restartBot(providerId);
  res.json({ providerId, status });
});

router.post('/unlink/:providerId', async (req: Request, res: Response) => {
  const providerId = req.params['providerId'] as string;
  await unlinkBot(providerId);
  res.json({ providerId, status: 'disconnected' });
});

router.get('/qr/:providerId', (req: Request, res: Response) => {
  const providerId = req.params['providerId'] as string;
  const instance = getBotInstance(providerId);
  const response: QrResponse = {
    providerId,
    qrCode: instance?.qrCode ?? null,
  };
  res.json(response);
});

router.post('/send', async (req: Request, res: Response) => {
  const { providerId, recipient, message } = req.body as { providerId: string; recipient: string; message: string };
  const success = await sendMessage(providerId, recipient, message);
  res.json({ success });
});

// Temporary debug endpoint: attempts to send and returns error details if any.
router.post('/send-debug', async (req: Request, res: Response) => {
  const secret = req.headers['x-bot-secret'] as string | undefined;
  if (secret !== BOT_INTERNAL_SECRET) return res.status(401).json({ error: 'Invalid bot secret' });

  const { providerId, recipient, message } = req.body as { providerId: string; recipient: string; message: string };
  const instance = getBotInstance(providerId);
  if (!instance || instance.status !== 'connected') return res.status(400).json({ error: 'Bot not connected' });

  try {
    await instance.client.sendMessage(recipient, message);
    return res.json({ success: true });
  } catch (err: any) {
    const details = err instanceof Error ? err.stack ?? err.message : String(err);
    console.error('[WhatsApp] send-debug error:', details);
    return res.status(500).json({ success: false, error: details });
  }
});

// Temporary secure endpoint to list chats for a provider (used to obtain group IDs)
router.get('/chats/:providerId', async (req: Request, res: Response) => {
  const secret = req.headers['x-bot-secret'] as string | undefined;
  if (secret !== BOT_INTERNAL_SECRET) {
    return res.status(401).json({ error: 'Invalid bot secret' });
  }

  const providerId = req.params['providerId'] as string;
  const instance = getBotInstance(providerId);
  if (!instance || instance.status !== 'connected') {
    return res.status(400).json({ error: 'Bot not connected for provider' });
  }

  try {
    // Try the library helper first. If it fails (internal whatsapp-web.js error),
    // fallback to evaluating a small script inside the page to extract minimal chat info.
    try {
      const chats = await instance.client.getChats();
      const out = chats.map((c: any) => ({
        id: c.id?._serialized ?? c.id ?? null,
        name: c.name ?? c.formattedTitle ?? c.contact?.pushname ?? null,
        isGroup: Boolean(c.isGroup),
      }));
      return res.json({ providerId, chats: out });
    } catch (libErr) {
      // fallback: evaluate in page context to get minimal chat list
      try {
        const page = (instance.client as any).pupPage ?? (instance.client as any).pupBrowser?.pages?.()[0];
        if (!page) throw new Error('pupPage not available');

        const raw = await page.evaluate(() => {
          try {
            // Access internal Store used by whatsapp-web.js
            const S: any = (window as any).Store;
            if (!S) return [];

            // Try common collections
            let list: any[] = [];
            if (S.chats && typeof S.chats.toArray === 'function') {
              list = S.chats.toArray();
            } else if (S.Chat && S.Chat.models) {
              list = Array.isArray(S.Chat.models) ? S.Chat.models : Object.values(S.Chat.models);
            } else if (S.Chat && typeof S.Chat.getModels === 'function') {
              list = S.Chat.getModels();
            }

            return list.map((c: any) => ({
              id: c.id && c.id._serialized ? c.id._serialized : (c.id ? c.id : null),
              name: c.name || c.formattedTitle || (c.contact && c.contact.pushname) || null,
              isGroup: !!c.isGroup,
            }));
          } catch (e) {
            return [];
          }
        });

        return res.json({ providerId, chats: raw });
      } catch (evalErr) {
        const details = evalErr instanceof Error ? evalErr.stack ?? evalErr.message : String(evalErr);
        console.error(`[WhatsApp] Fallback listing chats failed for ${providerId}:`, details);
        return res.status(500).json({ error: 'Failed to list chats', details });
      }
    }
  } catch (err) {
    const details = err instanceof Error ? err.stack ?? err.message : String(err);
    console.error(`[WhatsApp] Failed to list chats for ${providerId}:`, details);
    res.status(500).json({ error: 'Failed to list chats', details });
  }
});

export default router;
