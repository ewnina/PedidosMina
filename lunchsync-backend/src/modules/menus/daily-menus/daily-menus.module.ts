import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyMenusService } from './daily-menus.service';
import { DailyMenusController } from './daily-menus.controller';
import { DailyMenu } from './entities/daily-menu.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DailyMenu])],
  controllers: [DailyMenusController],
  providers: [DailyMenusService],
  exports: [DailyMenusService],
})
export class DailyMenusModule {}
