import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderCreatedEvent } from '../events/order-created.event';
import { WhatsappService } from '../../whatsapp/whatsapp.service';
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

    const bot = await this.providerBotRepo.findOne({
      where: { providerId: event.providerId },
    });

    if (!bot || !bot.isOnline) {
      this.logger.warn(`Bot not connected for provider ${event.providerId}`);
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
        serviceName: '',
        totalAmount: event.orderData.totalAmount,
      },
    );
  }
}
