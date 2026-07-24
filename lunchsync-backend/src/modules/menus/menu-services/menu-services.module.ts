import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuService } from './entities/menu-service.entity';
import { MenuServicesService } from './menu-services.service';
import { MenuServicesController } from './menu-services.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MenuService])],
  controllers: [MenuServicesController],
  providers: [MenuServicesService],
  exports: [MenuServicesService],
})
export class MenuServicesModule {}
