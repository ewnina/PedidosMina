import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';
import { DailyMenu } from '../menus/daily-menus/entities/daily-menu.entity';
import { MenuService } from '../menus/menu-services/entities/menu-service.entity';
import { ComboGroup } from '../menus/combo-groups/entities/combo-group.entity';
import { ComboOption } from '../menus/combo-options/entities/combo-option.entity';
import { DeliveryZone } from '../delivery-zones/entities/delivery-zone.entity';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { Provider } from '../providers/entities/provider.entity';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DailyMenu,
      MenuService,
      ComboGroup,
      ComboOption,
      DeliveryZone,
      Order,
      User,
      Provider,
    ]),
    OrdersModule,
  ],
  controllers: [EmployeeController],
  providers: [EmployeeService],
})
export class EmployeeModule {}
