import { Module } from '@nestjs/common';
import { BotController } from './bot.controller';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [UsersModule, AuthModule],
  controllers: [BotController],
})
export class BotModule {}
