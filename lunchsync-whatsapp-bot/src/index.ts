import 'dotenv/config';
import express from 'express';
import apiRoutes from './api/routes';

const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'whatsapp-bot' });
});

const PORT = process.env['PORT'] ?? 3001;

app.listen(PORT, () => {
  console.log(`[WhatsApp Bot] Service running on port ${PORT}`);
});

