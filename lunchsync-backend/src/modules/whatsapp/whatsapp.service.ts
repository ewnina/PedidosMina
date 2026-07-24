import { Injectable, Logger } from '@nestjs/common';
import { IWhatsappSender } from './interfaces/whatsapp-sender.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsappLog } from './entities/whatsapp-log.entity';
import { MessageFactory } from './message-factory';
import { WhatsappGateway } from './whatsapp.gateway';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    @InjectRepository(WhatsappLog)
    private readonly whatsappLogRepo: Repository<WhatsappLog>,
    private readonly sender: IWhatsappSender,
    private readonly gateway: WhatsappGateway,
  ) {}

  async getStatus(providerId: string) {
    return this.sender.getStatus(providerId);
  }

  async startBot(providerId: string) {
    const result = await this.sender.start(providerId);
    this.gateway.emitStatusChanged(providerId, result.status);
    return result;
  }

  async stopBot(providerId: string) {
    const result = await this.sender.stop(providerId);
    this.gateway.emitStatusChanged(providerId, result.status);
    return result;
  }

  async restartBot(providerId: string) {
    const result = await this.sender.restart(providerId);
    this.gateway.emitStatusChanged(providerId, result.status);
    return result;
  }

  async unlinkBot(providerId: string) {
    const result = await this.sender.unlink(providerId);
    this.gateway.emitStatusChanged(providerId, result.status);
    return result;
  }

  async getQr(providerId: string) {
    return this.sender.getQr(providerId);
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
    },
  ): Promise<boolean> {
    const message = MessageFactory.newOrderNotification(data);
    const success = await this.sender.sendMessage(providerId, recipient, message);

    const log = this.whatsappLogRepo.create({
      providerId,
      orderId: data.orderId,
      recipientPhoneOrGroup: recipient,
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
}
