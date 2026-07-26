import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IWhatsappSender } from './interfaces/whatsapp-sender.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsappLog } from './entities/whatsapp-log.entity';
import { MessageFactory } from './message-factory';
import { WhatsappGateway } from './whatsapp.gateway';
import { ProviderBot } from '../provider-bots/entities/provider-bot.entity';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly polling = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    @InjectRepository(WhatsappLog)
    private readonly whatsappLogRepo: Repository<WhatsappLog>,
    @InjectRepository(ProviderBot)
    private readonly providerBotRepo: Repository<ProviderBot>,
    private readonly sender: IWhatsappSender,
    private readonly gateway: WhatsappGateway,
  ) {}

  async getStatus(providerId: string) {
    return this.sender.getStatus(providerId);
  }

  async getQr(providerId: string) {
    return this.sender.getQr(providerId);
  }

  async startBot(providerId: string) {
    const result = await this.sender.start(providerId);
    this.gateway.emitStatusChanged(providerId, result.status);

    if (result.status === 'waiting_qr' || result.status === 'starting') {
      this.startQrPolling(providerId);
    }

    return result;
  }

  async stopBot(providerId: string) {
    this.stopQrPolling(providerId);
    const result = await this.sender.stop(providerId);
    this.gateway.emitStatusChanged(providerId, result.status);
    return result;
  }

  async restartBot(providerId: string) {
    this.stopQrPolling(providerId);
    const result = await this.sender.restart(providerId);
    this.gateway.emitStatusChanged(providerId, result.status);

    if (result.status === 'waiting_qr' || result.status === 'starting') {
      this.startQrPolling(providerId);
    }

    return result;
  }

  async unlinkBot(providerId: string) {
    this.stopQrPolling(providerId);
    const result = await this.sender.unlink(providerId);
    this.gateway.emitStatusChanged(providerId, result.status);
    return result;
  }

  async sendOrderNotification(
    providerId: string,
    recipient: string,
    data: {
      orderNumber: string;
      employeeName: string;
      employeePhone: string;
      serviceName: string;
      totalAmount: number;
      specialInstructions?: string;
      orderId: string;
      deliveryZoneName: string;
    },
  ): Promise<boolean> {
    const message = MessageFactory.newOrderNotification(data);

    // If recipient not configured (e.g. 'pending' placeholder), fallback to provider phone
    let target = recipient;
    if (!target || target.trim() === '' || target === 'pending') {
      try {
        const bot = await this.providerBotRepo.findOne({ where: { providerId }, relations: { provider: true } });
        if (bot && bot.provider && bot.provider.phoneNumber) {
          target = `${bot.provider.phoneNumber}@c.us`;
          this.logger.warn(`[WhatsApp] recipient not configured for provider ${providerId}, falling back to provider phone ${target}`);
        } else {
          this.logger.warn(`[WhatsApp] recipient not configured and provider phone missing for ${providerId}`);
        }
      } catch (err) {
        this.logger.warn(`[WhatsApp] error resolving provider phone for fallback for ${providerId}: ${err}`);
      }
    }

    const success = await this.sender.sendMessage(providerId, target, message);

    const log = this.whatsappLogRepo.create({
      providerId,
      orderId: data.orderId,
      recipientPhoneOrGroup: target,
      messageType: 'order_notification',
      messagePayload: message,
      status: success ? 'sent' : 'failed',
      attempts: 1,
    });
    await this.whatsappLogRepo.save(log);

    if (success) {
      this.gateway.emitMessageSent(providerId, recipient);
    }

    return success;
  }

  private startQrPolling(providerId: string): void {
    this.stopQrPolling(providerId);

    const poll = async (): Promise<void> => {
      try {
        const { qrCode } = await this.sender.getQr(providerId);
        const bot = await this.sender.getStatus(providerId);

        if (bot.status !== 'waiting_qr' && bot.status !== 'starting') {
          this.logger.log(`[QR Poll] Bot ${providerId} is now ${bot.status}, stopping poll`);
          this.gateway.emitStatusChanged(providerId, bot.status);
          if (bot.status === 'connected') {
            this.gateway.emitConnected(providerId);
          }
          this.polling.delete(providerId);
          return;
        }

        this.gateway.emitQrGenerated(providerId, qrCode);

        if (qrCode) {
          this.logger.debug(`[QR Poll] Emitted QR for ${providerId}`);
        }
      } catch (err) {
        this.logger.warn(`[QR Poll] Error polling QR for ${providerId}: ${err}`);
        this.polling.delete(providerId);
        return;
      }

      this.polling.set(providerId, setTimeout(poll, 3000));
    };

    poll();
  }

  private stopQrPolling(providerId: string): void {
    const timer = this.polling.get(providerId);
    if (timer) {
      clearTimeout(timer);
      this.polling.delete(providerId);
    }
  }

  async updateGroup(providerId: string, whatsappGroupId: string): Promise<{ success: boolean }> {
    let bot = await this.providerBotRepo.findOne({ where: { providerId } });
    if (!bot) {
      bot = this.providerBotRepo.create({ providerId, whatsappGroupId });
    } else {
      bot.whatsappGroupId = whatsappGroupId;
    }
    await this.providerBotRepo.save(bot);
    return { success: true };
  }

  // Send a raw text message to a recipient (group or phone) for a provider and log it
  async sendRawMessage(providerId: string, recipient: string, message: string): Promise<boolean> {
    const success = await this.sender.sendMessage(providerId, recipient, message);

    const log = this.whatsappLogRepo.create({
      providerId,
      orderId: null,
      recipientPhoneOrGroup: recipient,
      messageType: 'raw_message',
      messagePayload: message,
      status: success ? 'sent' : 'failed',
      attempts: 1,
    });
    await this.whatsappLogRepo.save(log);

    if (success) this.gateway.emitMessageSent(providerId, recipient);
    return success;
  }
}
