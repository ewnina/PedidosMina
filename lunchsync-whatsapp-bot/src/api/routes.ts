import { Router, Request, Response, NextFunction } from 'express';
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

function requireSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = req.headers['x-bot-secret'] as string | undefined;
  if (secret !== BOT_INTERNAL_SECRET) {
    res.status(401).json({ error: 'Invalid bot secret' });
    return;
  }
  next();
}

router.use(requireSecret);

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
  try {
    const status = await startBot(providerId);
    res.json({ providerId, status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[WhatsApp] Error starting bot ${providerId}:`, msg);
    res.status(500).json({ providerId, status: 'disconnected', error: msg });
  }
});

router.post('/stop/:providerId', async (req: Request, res: Response) => {
  const providerId = req.params['providerId'] as string;
  try {
    const status = await stopBot(providerId);
    res.json({ providerId, status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[WhatsApp] Error stopping bot ${providerId}:`, msg);
    res.status(500).json({ providerId, status: 'disconnected', error: msg });
  }
});

router.post('/restart/:providerId', async (req: Request, res: Response) => {
  const providerId = req.params['providerId'] as string;
  try {
    const status = await restartBot(providerId);
    res.json({ providerId, status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[WhatsApp] Error restarting bot ${providerId}:`, msg);
    res.status(500).json({ providerId, status: 'disconnected', error: msg });
  }
});

router.post('/unlink/:providerId', async (req: Request, res: Response) => {
  const providerId = req.params['providerId'] as string;
  try {
    await unlinkBot(providerId);
    res.json({ providerId, status: 'disconnected' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[WhatsApp] Error unlinking bot ${providerId}:`, msg);
    res.status(500).json({ providerId, status: 'disconnected', error: msg });
  }
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
  if (!providerId || !recipient || !message) {
    res.status(400).json({ error: 'Missing providerId, recipient, or message' });
    return;
  }
  try {
    const success = await sendMessage(providerId, recipient, message);
    res.json({ success });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[WhatsApp] Error sending message to ${recipient}:`, msg);
    res.status(500).json({ success: false, error: msg });
  }
});

router.post('/send-debug', async (req: Request, res: Response) => {
  const { providerId, recipient, message } = req.body as { providerId: string; recipient: string; message: string };
  const instance = getBotInstance(providerId);
  if (!instance || instance.status !== 'connected') {
    res.status(400).json({ error: 'Bot not connected' });
    return;
  }

  try {
    await instance.client.sendMessage(recipient, message);
    res.json({ success: true });
  } catch (err) {
    const details = err instanceof Error ? err.stack ?? err.message : String(err);
    console.error('[WhatsApp] send-debug error:', details);
    res.status(500).json({ success: false, error: details });
  }
});

router.get('/chats/:providerId', async (req: Request, res: Response) => {
  const providerId = req.params['providerId'] as string;
  const instance = getBotInstance(providerId);
  if (!instance || instance.status !== 'connected') {
    res.status(400).json({ error: 'Bot not connected for provider' });
    return;
  }

  try {
    try {
      const chats = await instance.client.getChats();
      const out = chats.map((c: any) => ({
        id: c.id?._serialized ?? c.id ?? null,
        name: c.name ?? c.formattedTitle ?? c.contact?.pushname ?? null,
        isGroup: Boolean(c.isGroup),
      }));
      res.json({ providerId, chats: out });
    } catch (libErr) {
      try {
        const page = (instance.client as any).pupPage ?? (instance.client as any).pupBrowser?.pages?.()[0];
        if (!page) throw new Error('pupPage not available');

        const raw = await page.evaluate(() => {
          try {
            const S: any = (window as any).Store;
            if (!S) return [];

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

        res.json({ providerId, chats: raw });
      } catch (evalErr) {
        const details = evalErr instanceof Error ? evalErr.stack ?? evalErr.message : String(evalErr);
        console.error(`[WhatsApp] Fallback listing chats failed for ${providerId}:`, details);
        res.status(500).json({ error: 'Failed to list chats', details });
      }
    }
  } catch (err) {
    const details = err instanceof Error ? err.stack ?? err.message : String(err);
    console.error(`[WhatsApp] Failed to list chats for ${providerId}:`, details);
    res.status(500).json({ error: 'Failed to list chats', details });
  }
});

export default router;
