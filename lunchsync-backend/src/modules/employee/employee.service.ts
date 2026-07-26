import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DailyMenu } from '../menus/daily-menus/entities/daily-menu.entity';
import { MenuService } from '../menus/menu-services/entities/menu-service.entity';
import { ComboGroup } from '../menus/combo-groups/entities/combo-group.entity';
import { ComboOption } from '../menus/combo-options/entities/combo-option.entity';
import { DeliveryZone } from '../delivery-zones/entities/delivery-zone.entity';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { Provider } from '../providers/entities/provider.entity';
import { OrdersService } from '../orders/orders.service';
import { CreateOrderDto } from '../orders/dto/create-order.dto';

interface MenuServiceWithGroups extends MenuService {
  comboGroups: (ComboGroup & { comboOptions: ComboOption[] })[];
}

export interface TodayMenuResult {
  id: string;
  servingDate: string;
  orderCutoffTime: Date;
  services: MenuServiceWithGroups[];
}

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(DailyMenu)
    private readonly dailyMenuRepo: Repository<DailyMenu>,
    @InjectRepository(MenuService)
    private readonly menuServiceRepo: Repository<MenuService>,
    @InjectRepository(ComboGroup)
    private readonly comboGroupRepo: Repository<ComboGroup>,
    @InjectRepository(ComboOption)
    private readonly comboOptionRepo: Repository<ComboOption>,
    @InjectRepository(DeliveryZone)
    private readonly deliveryZoneRepo: Repository<DeliveryZone>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    private readonly ordersService: OrdersService,
  ) {}

  async getTodayMenu(providerId: string): Promise<TodayMenuResult | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const menu = await this.dailyMenuRepo.findOne({
      where: {
        providerId,
        servingDate: today.toISOString().split('T')[0]!,
        isActive: true,
      },
    });

    if (!menu || !menu.publishedAt) return null;

    const services = await this.menuServiceRepo.find({
      where: { dailyMenuId: menu.id, isAvailable: true },
    });

    const servicesWithGroups: MenuServiceWithGroups[] = [];
    for (const service of services) {
      const groups = await this.comboGroupRepo.find({
        where: { menuServiceId: service.id },
        order: { createdAt: 'ASC' },
      });

      const groupsWithOptions: (ComboGroup & { comboOptions: ComboOption[] })[] = [];
      for (const group of groups) {
        const options = await this.comboOptionRepo.find({
          where: { comboGroupId: group.id, isAvailable: true },
          order: { createdAt: 'ASC' },
        });
        groupsWithOptions.push({ ...group, comboOptions: options });
      }

      servicesWithGroups.push({ ...service, comboGroups: groupsWithOptions });
    }

    return {
      id: menu.id,
      servingDate: menu.servingDate,
      orderCutoffTime: menu.orderCutoffTime,
      services: servicesWithGroups,
    };
  }

  async getDeliveryZones(providerId: string) {
    return this.deliveryZoneRepo.find({
      where: { providerId, isActive: true },
      order: { zoneName: 'ASC' },
    });
  }

  async placeOrder(userId: string, providerId: string, dto: CreateOrderDto) {
    const zone = await this.deliveryZoneRepo.findOne({
      where: { id: dto.deliveryZoneId, providerId },
    });
    if (!zone) throw new NotFoundException('Zona de distribución no encontrada');

    const provider = await this.providerRepo.findOne({ where: { id: providerId } });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const service = await this.menuServiceRepo.findOne({ where: { id: dto.menuServiceId } });
    if (!service) throw new NotFoundException('Servicio no encontrado');

    const orderId = await this.ordersService.createOrder(
      dto,
      userId,
      providerId,
      zone.zoneName,
      user.fullName,
      user.phoneNumber ?? '',
      provider.name,
      service.name,
    );

    return { orderId };
  }

  async getMyOrders(userId: string, providerId: string) {
    return this.orderRepo.find({
      where: { userId, providerId },
      order: { createdAt: 'DESC' },
    });
  }
}
