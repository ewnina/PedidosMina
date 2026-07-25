import { Controller, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import os from 'os';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';

const BOT_SECRET = process.env['BOT_INTERNAL_SECRET'] ?? 'lunchsync-bot-internal';

function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const LOCAL_IP = getLocalIp();

@Controller('bot')
export class BotController {
  constructor(
    private readonly users: UsersService,
    private readonly auth: AuthService,
  ) {}

  @Post('magic-link')
  async generateMagicLink(
    @Body() body: { phoneNumber: string; providerId: string },
    @Headers('x-bot-secret') secret: string,
  ) {
    if (secret !== BOT_SECRET) {
      throw new UnauthorizedException('Invalid bot secret');
    }

    const user = await this.users.findOrCreateByPhone(body.phoneNumber);
    const { token, jti } = await this.auth.generateMagicLink({
      userId: user.id,
      providerId: body.providerId,
    });

    const frontendPort = process.env['FRONTEND_PORT'] ?? '5173';
    const baseUrl = process.env['FRONTEND_URL'] ?? `http://${LOCAL_IP}:${frontendPort}`;
    const link = `${baseUrl}/employee/auth?token=${token}&jti=${jti}`;

    return { link, userId: user.id, phoneNumber: body.phoneNumber };
  }
}
