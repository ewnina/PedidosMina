import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappGateway } from './whatsapp.gateway';
import { HttpWhatsappSender } from './adapters/http-whatsapp.sender';
import { IWhatsappSender } from './interfaces/whatsapp-sender.interface';
import { WhatsappLog } from './entities/whatsapp-log.entity';
import { ProviderBot } from '../provider-bots/entities/provider-bot.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WhatsappLog, ProviderBot])],
  controllers: [WhatsappController],
  providers: [
    WhatsappService,
    WhatsappGateway,
    {
      provide: IWhatsappSender,
      useClass: HttpWhatsappSender,
    },
  ],
  exports: [WhatsappService, IWhatsappSender],
})
export class WhatsappModule {}
