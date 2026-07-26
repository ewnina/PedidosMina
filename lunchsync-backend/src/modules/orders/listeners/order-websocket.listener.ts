import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderCreatedEvent } from '../events/order-created.event';
import { MenuRealtimeGateway } from '../../realtime/menu-realtime.gateway';

@Injectable()
export class OrderWebSocketListener {
  private readonly logger = new Logger(OrderWebSocketListener.name);

  constructor(private readonly realtimeGateway: MenuRealtimeGateway) {}

  @OnEvent('order.created')
  handleOrderCreated(event: OrderCreatedEvent): void {
    this.logger.log(`WebSocket notification for order ${event.orderData.orderNumber}`);

    this.realtimeGateway.emitOrderNew(event.providerId, {
      orderId: event.orderId,
      orderNumber: event.orderData.orderNumber,
      employeeName: event.orderData.employeeName,
      totalAmount: event.orderData.totalAmount,
      orderStatus: 'pending',
      paymentStatus: 'unpaid',
      createdAt: new Date().toISOString(),
    });

    this.realtimeGateway.emitComboOptionUpdate(event.dailyMenuId, {
      optionId: '',
      isAvailable: true,
      stockQuantity: null,
    });
  }
}
