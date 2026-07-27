import { Module } from '@nestjs/common';
import { BotController } from './bot.controller';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [UsersModule, AuthModule, WhatsappModule],
  controllers: [BotController],
})
export class BotModule {}
