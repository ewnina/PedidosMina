import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('providers/:providerId/whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('status')
  getStatus(@Param('providerId') providerId: string) {
    return this.whatsappService.getStatus(providerId);
  }

  @Post('start')
  startBot(@Param('providerId') providerId: string) {
    return this.whatsappService.startBot(providerId);
  }

  @Post('stop')
  stopBot(@Param('providerId') providerId: string) {
    return this.whatsappService.stopBot(providerId);
  }

  @Post('restart')
  restartBot(@Param('providerId') providerId: string) {
    return this.whatsappService.restartBot(providerId);
  }

  @Post('unlink')
  unlinkBot(@Param('providerId') providerId: string) {
    return this.whatsappService.unlinkBot(providerId);
  }

  @Get('qr')
  getQr(@Param('providerId') providerId: string) {
    return this.whatsappService.getQr(providerId);
  }
}
