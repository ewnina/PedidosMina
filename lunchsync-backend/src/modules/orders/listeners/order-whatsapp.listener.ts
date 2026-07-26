import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderCreatedEvent } from '../events/order-created.event';
import { WhatsappService } from '../../whatsapp/whatsapp.service';
import { MessageFactory } from '../../whatsapp/message-factory';
import { ProviderBot } from '../../provider-bots/entities/provider-bot.entity';

@Injectable()
export class OrderWhatsAppListener {
  private readonly logger = new Logger(OrderWhatsAppListener.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    @InjectRepository(ProviderBot)
    private readonly providerBotRepo: Repository<ProviderBot>,
  ) {}

  @OnEvent('order.created')
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    this.logger.log(`WhatsApp notification for order ${event.orderData.orderNumber}`);

    const status = await this.whatsappService.getStatus(event.providerId);

    if (status.status !== 'connected') {
      this.logger.warn(`Bot not connected for provider ${event.providerId} (status: ${status.status})`);
      return;
    }

    const bot = await this.providerBotRepo.findOne({
      where: { providerId: event.providerId },
    });

    if (!bot || !bot.whatsappGroupId) {
      this.logger.warn(`No WhatsApp group configured for provider ${event.providerId}`);
      return;
    }

    await this.whatsappService.sendOrderNotification(
      event.providerId,
      bot.whatsappGroupId,
      {
        orderId: event.orderId,
        orderNumber: event.orderData.orderNumber,
        employeeName: event.orderData.employeeName,
        employeePhone: event.orderData.employeePhone,
        serviceName: event.orderData.serviceName,
        totalAmount: event.orderData.totalAmount,
        specialInstructions: event.orderData.specialInstructions ?? undefined,
        deliveryZoneName: event.orderData.deliveryZoneName,
        items: event.orderData.items,
      },
    );
  }

  @OnEvent('order.accepted')
  async handleOrderAccepted(payload: {
    orderId: string;
    providerId: string;
    orderNumber: string;
    employeeName: string;
    employeePhone: string;
  }): Promise<void> {
    this.logger.log(`WhatsApp notification for accepted order ${payload.orderNumber}`);

    const status = await this.whatsappService.getStatus(payload.providerId);
    if (status.status !== 'connected') {
      this.logger.warn(`Bot not connected for provider ${payload.providerId} (status: ${status.status})`);
      return;
    }

    const bot = await this.providerBotRepo.findOne({ where: { providerId: payload.providerId } });
    if (!bot || !bot.whatsappGroupId) {
      this.logger.warn(`No WhatsApp group configured for provider ${payload.providerId}`);
      return;
    }

    const message = MessageFactory.orderAccepted({ orderNumber: payload.orderNumber, employeeName: payload.employeeName });
    await this.whatsappService.sendRawMessage(payload.providerId, bot.whatsappGroupId, message);
  }

  @OnEvent('order.cancelled')
  async handleOrderCancelled(payload: {
    orderId: string;
    providerId: string;
    orderNumber: string;
    employeeName: string;
    employeePhone: string;
  }): Promise<void> {
    this.logger.log(`WhatsApp notification for cancelled order ${payload.orderNumber}`);

    const status = await this.whatsappService.getStatus(payload.providerId);
    if (status.status !== 'connected') {
      this.logger.warn(`Bot not connected for provider ${payload.providerId} (status: ${status.status})`);
      return;
    }

    const bot = await this.providerBotRepo.findOne({ where: { providerId: payload.providerId } });
    if (!bot || !bot.whatsappGroupId) {
      this.logger.warn(`No WhatsApp group configured for provider ${payload.providerId}`);
      return;
    }

    const message = MessageFactory.orderCancelled({ orderNumber: payload.orderNumber, employeeName: payload.employeeName });
    await this.whatsappService.sendRawMessage(payload.providerId, bot.whatsappGroupId, message);
  }
}
