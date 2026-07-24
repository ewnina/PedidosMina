import { registerAs } from '@nestjs/config';
import { entities } from '../common/entities';

export default registerAs('database', () => ({
  type: 'postgres' as const,
  host: process.env['DB_HOST'] ?? 'localhost',
  port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
  username: process.env['DB_USERNAME'] ?? 'lunchsync',
  password: process.env['DB_PASSWORD'] ?? 'admin1234',
  database: process.env['DB_DATABASE'] ?? 'lunchsync',
  entities,
  synchronize: false,
}));
