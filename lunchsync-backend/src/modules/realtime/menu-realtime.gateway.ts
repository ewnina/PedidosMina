import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

export interface ComboOptionUpdatedPayload {
  optionId: string;
  isAvailable: boolean;
  stockQuantity: number | null;
}

export interface OrderNewPayload {
  orderId: string;
  orderNumber: string;
  employeeName: string;
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
}

@WebSocketGateway({ cors: { origin: true }, namespace: '/realtime' })
export class MenuRealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MenuRealtimeGateway.name);

  handleConnection(client: Socket): void {
    const dailyMenuId = client.handshake.query['dailyMenuId'];
    if (typeof dailyMenuId === 'string') {
      client.join(`menu-realtime-${dailyMenuId}`);
      this.logger.log(`Client ${client.id} joined menu-realtime-${dailyMenuId}`);
    }

    const providerId = client.handshake.query['providerId'];
    if (typeof providerId === 'string') {
      client.join(`orders-${providerId}`);
      this.logger.log(`Client ${client.id} joined orders-${providerId}`);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  emitComboOptionUpdate(dailyMenuId: string, payload: ComboOptionUpdatedPayload): void {
    this.server.to(`menu-realtime-${dailyMenuId}`).emit('combo-option-updated', payload);
  }

  emitOrderNew(providerId: string, payload: OrderNewPayload): void {
    this.server.to(`orders-${providerId}`).emit('order-new', payload);
  }
}
