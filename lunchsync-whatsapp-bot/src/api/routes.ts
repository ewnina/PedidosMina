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

export default router;
