import { Controller, Post, Patch, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import os from 'os';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

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
    private readonly whatsapp: WhatsappService,
  ) {}

  @Post('magic-link')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async generateMagicLink(
    @Body() body: { author: string; whatsappGroupId: string; providerId: string },
    @Headers('x-bot-secret') secret: string,
  ) {
    if (secret !== BOT_SECRET) {
      throw new UnauthorizedException('Invalid bot secret');
    }

    const existingUser = await this.users.findByWhatsappLid(body.author);
    const userExists = !!existingUser;

    let userId = existingUser?.id;
    if (!userExists) {
      const pendingUser = await this.users.createPendingUserByLid(body.author);
      userId = pendingUser.id;
    }

    const { token, jti } = await this.auth.generateMagicLink({
      userId: userId!,
      providerId: body.providerId,
    });

    const frontendPort = process.env['FRONTEND_PORT'] ?? '5173';
    const baseUrl = process.env['FRONTEND_URL'] ?? `http://${LOCAL_IP}:${frontendPort}`;
    const link = `${baseUrl}/employee/auth?token=${token}&jti=${jti}`;

    return { link, userId, whatsappLid: body.author, userExists };
  }

  @Patch('link-group')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async linkGroup(
    @Body() body: { providerId: string; whatsappGroupId: string },
    @Headers('x-bot-secret') secret: string,
  ) {
    if (secret !== BOT_SECRET) {
      throw new UnauthorizedException('Invalid bot secret');
    }

    await this.whatsapp.updateGroup(body.providerId, body.whatsappGroupId);
    return { success: true };
  }
}
