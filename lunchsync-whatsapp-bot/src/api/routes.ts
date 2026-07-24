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
  const { providerId } = req.params;
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
  const { providerId } = req.params;
  const status = await startBot(providerId);
  res.json({ providerId, status });
});

router.post('/stop/:providerId', (req: Request, res: Response) => {
  const { providerId } = req.params;
  const status = stopBot(providerId);
  res.json({ providerId, status });
});

router.post('/restart/:providerId', (req: Request, res: Response) => {
  const { providerId } = req.params;
  const status = restartBot(providerId);
  res.json({ providerId, status });
});

router.post('/unlink/:providerId', (req: Request, res: Response) => {
  const { providerId } = req.params;
  unlinkBot(providerId);
  res.json({ providerId, status: 'disconnected' });
});

router.get('/qr/:providerId', (req: Request, res: Response) => {
  const { providerId } = req.params;
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
