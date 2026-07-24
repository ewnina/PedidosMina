import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderCreatedEvent } from './events/order-created.event';
import { Order } from './entities/order.entity';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createOrder(
    dto: CreateOrderDto,
    userId: string,
    providerId: string,
    deliveryZoneName: string,
    employeeName: string,
    employeePhone: string,
    providerName: string,
  ): Promise<string> {
    const orderNumber = this.generateOrderNumber();

    const result = await this.dataSource.query<{ process_order_with_stock_check: string }[]>(
      `SELECT process_order_with_stock_check(
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      )`,
      [
        userId,
        providerId,
        dto.dailyMenuId,
        dto.deliveryZoneId,
        dto.menuServiceId,
        dto.selectedOptionIds,
        0, // total_amount se calcula en la función
        orderNumber,
        dto.specialInstructions ?? null,
      ],
    );

    const orderId = result[0]!.process_order_with_stock_check;

    this.eventEmitter.emit(
      'order.created',
      new OrderCreatedEvent(orderId, providerId, dto.dailyMenuId, {
        orderNumber,
        employeeName,
        employeePhone,
        totalAmount: 0,
      }),
    );

    this.logger.log(`Order ${orderNumber} created: ${orderId}`);
    return orderId;
  }

  async findAll(providerId: string, dailyMenuId?: string): Promise<Order[]> {
    const where: Record<string, string> = { providerId };
    if (dailyMenuId) {
      where.dailyMenuId = dailyMenuId;
    }
    return this.orderRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(id: string, status: string): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    order.orderStatus = status;
    return this.orderRepo.save(order);
  }

  private generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }
}
