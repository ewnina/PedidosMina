import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: true }, namespace: '/whatsapp' })
export class WhatsappGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(WhatsappGateway.name);

  handleConnection(client: Socket): void {
    const providerId = client.handshake.query['providerId'];
    if (typeof providerId === 'string') {
      client.join(`whatsapp-${providerId}`);
      this.logger.log(`Client ${client.id} joined whatsapp-${providerId}`);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  emitStatusChanged(providerId: string, status: string): void {
    this.server.to(`whatsapp-${providerId}`).emit('whatsapp-status-changed', { providerId, status });
  }

  emitQrGenerated(providerId: string, qrCode: string | null): void {
    this.server.to(`whatsapp-${providerId}`).emit('whatsapp-qr-generated', { providerId, qrCode });
  }

  emitConnected(providerId: string): void {
    this.server.to(`whatsapp-${providerId}`).emit('whatsapp-connected', { providerId });
  }

  emitDisconnected(providerId: string): void {
    this.server.to(`whatsapp-${providerId}`).emit('whatsapp-disconnected', { providerId });
  }

  emitAuthenticationFailed(providerId: string): void {
    this.server.to(`whatsapp-${providerId}`).emit('whatsapp-authentication-failed', { providerId });
  }

  emitMessageSent(providerId: string, recipient: string): void {
    this.server.to(`whatsapp-${providerId}`).emit('whatsapp-message-sent', { providerId, recipient });
  }

  emitMessageReceived(providerId: string, sender: string): void {
    this.server.to(`whatsapp-${providerId}`).emit('whatsapp-message-received', { providerId, sender });
  }
}
