import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderWebSocketListener } from './listeners/order-websocket.listener';
import { OrderWhatsAppListener } from './listeners/order-whatsapp.listener';
import { RealtimeModule } from '../realtime/realtime.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { ProviderBot } from '../provider-bots/entities/provider-bot.entity';
import { Order } from './entities/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProviderBot, Order]),
    RealtimeModule,
    WhatsappModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderWebSocketListener, OrderWhatsAppListener],
  exports: [OrdersService],
})
export class OrdersModule {}
