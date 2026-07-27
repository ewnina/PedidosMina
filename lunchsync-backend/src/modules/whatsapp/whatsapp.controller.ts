import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantIsolationGuard } from '../auth/guards/tenant-isolation.guard';

@Controller('providers/:providerId/whatsapp')
@UseGuards(JwtAuthGuard, TenantIsolationGuard)
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

  @Get('chats')
  getChats(@Param('providerId') providerId: string) {
    return this.whatsappService.getChats(providerId);
  }

  @Get('group')
  getGroup(@Param('providerId') providerId: string) {
    return this.whatsappService.getGroup(providerId);
  }

  @Patch('group')
  updateGroup(@Param('providerId') providerId: string, @Body() body: { whatsappGroupId: string }) {
    return this.whatsappService.updateGroup(providerId, body.whatsappGroupId);
  }
}
