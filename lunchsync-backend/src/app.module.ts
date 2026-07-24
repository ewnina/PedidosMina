import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import databaseConfig from './config/database.config';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrdersModule } from './modules/orders/orders.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { ProviderAccountsModule } from './modules/provider-accounts/provider-accounts.module';
import { DailyMenusModule } from './modules/menus/daily-menus/daily-menus.module';
import { MenuServicesModule } from './modules/menus/menu-services/menu-services.module';
import { ComboGroupsModule } from './modules/menus/combo-groups/combo-groups.module';
import { ComboOptionsModule } from './modules/menus/combo-options/combo-options.module';
import { DeliveryZonesModule } from './modules/delivery-zones/delivery-zones.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => config.get('database')!,
    }),
    EventEmitterModule.forRoot(),
    RealtimeModule,
    AuthModule,
    OrdersModule,
    WhatsappModule,
    ProvidersModule,
    ProviderAccountsModule,
    DailyMenusModule,
    MenuServicesModule,
    ComboGroupsModule,
    ComboOptionsModule,
    DeliveryZonesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
