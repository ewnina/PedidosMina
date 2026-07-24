import { Module } from '@nestjs/common';
import { MenuRealtimeGateway } from './menu-realtime.gateway';

@Module({
  providers: [MenuRealtimeGateway],
  exports: [MenuRealtimeGateway],
})
export class RealtimeModule {}
