import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { NotFoundException } from '@nestjs/common';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepo: jest.Mocked<Repository<Order>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let dataSource: jest.Mocked<DataSource>;

  const mockOrder: Partial<Order> = {
    id: 'order-uuid-1',
    orderNumber: 'ORD-TEST-001',
    userId: 'user-uuid-1',
    providerId: 'provider-uuid-1',
    dailyMenuId: 'menu-uuid-1',
    deliveryZoneId: 'zone-uuid-1',
    employeeName: 'Juan Perez',
    employeePhone: '1234567890',
    providerName: 'Cocina Central',
    deliveryZoneName: 'Zona Norte',
    totalAmount: 15000,
    orderStatus: 'pending',
    paymentStatus: 'unpaid',
    specialInstructions: 'Sin cebolla',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockOrderRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const mockDataSource = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepo = module.get(getRepositoryToken(Order));
    eventEmitter = module.get(EventEmitter2);
    dataSource = module.get(DataSource);
  });

  describe('createOrder', () => {
    it('should create an order via stored function and emit event', async () => {
      dataSource.query.mockResolvedValue([{ process_order_with_stock_check: 'new-order-uuid' }]);

      const result = await service.createOrder(
        {
          dailyMenuId: 'menu-uuid-1',
          deliveryZoneId: 'zone-uuid-1',
          menuServiceId: 'service-uuid-1',
          selectedOptionIds: ['opt-1', 'opt-2'],
          totalAmount: 15000,
          specialInstructions: 'Sin cebolla',
        },
        'user-uuid-1',
        'provider-uuid-1',
        'Zona Norte',
        'Juan Perez',
        '1234567890',
        'Cocina Central',
        'Almuerzo Ejecutivo',
      );

      expect(result).toBe('new-order-uuid');
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('process_order_with_stock_check'),
        expect.arrayContaining([
          'user-uuid-1',
          'provider-uuid-1',
          'menu-uuid-1',
          'zone-uuid-1',
          'service-uuid-1',
          ['opt-1', 'opt-2'],
          15000,
          expect.stringContaining('ORD-'),
          'Sin cebolla',
          'Juan Perez',
          '1234567890',
          'Cocina Central',
          'Zona Norte',
          'Almuerzo Ejecutivo',
        ]),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'order.created',
        expect.objectContaining({
          orderId: 'new-order-uuid',
          providerId: 'provider-uuid-1',
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all orders', async () => {
      orderRepo.find.mockResolvedValue([mockOrder as Order]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(orderRepo.find).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
      });
    });

    it('should filter by providerId', async () => {
      orderRepo.find.mockResolvedValue([mockOrder as Order]);

      await service.findAll('provider-uuid-1');

      expect(orderRepo.find).toHaveBeenCalledWith({
        where: { providerId: 'provider-uuid-1' },
        order: { createdAt: 'DESC' },
      });
    });

    it('should filter by dailyMenuId', async () => {
      orderRepo.find.mockResolvedValue([]);

      await service.findAll(undefined, 'menu-uuid-1');

      expect(orderRepo.find).toHaveBeenCalledWith({
        where: { dailyMenuId: 'menu-uuid-1' },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('updateStatus', () => {
    it('should update order status to accepted and emit event', async () => {
      orderRepo.findOne.mockResolvedValue(mockOrder as Order);
      orderRepo.save.mockResolvedValue({ ...mockOrder, orderStatus: 'accepted' } as Order);

      const result = await service.updateStatus('order-uuid-1', 'accepted');

      expect(result.orderStatus).toBe('accepted');
      expect(orderRepo.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('order.accepted', expect.objectContaining({
        orderId: 'order-uuid-1',
        providerId: 'provider-uuid-1',
      }));
    });

    it('should update order status to cancelled and emit event', async () => {
      orderRepo.findOne.mockResolvedValue(mockOrder as Order);
      orderRepo.save.mockResolvedValue({ ...mockOrder, orderStatus: 'cancelled' } as Order);

      const result = await service.updateStatus('order-uuid-1', 'cancelled');

      expect(result.orderStatus).toBe('cancelled');
      expect(eventEmitter.emit).toHaveBeenCalledWith('order.cancelled', expect.objectContaining({
        orderId: 'order-uuid-1',
      }));
    });

    it('should throw NotFoundException for non-existent order', async () => {
      orderRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateStatus('nonexistent', 'accepted'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not emit events for non-accepted/cancelled statuses', async () => {
      orderRepo.findOne.mockResolvedValue(mockOrder as Order);
      orderRepo.save.mockResolvedValue({ ...mockOrder, orderStatus: 'preparing' } as Order);

      await service.updateStatus('order-uuid-1', 'preparing');

      expect(eventEmitter.emit).not.toHaveBeenCalledWith('order.accepted', expect.anything());
      expect(eventEmitter.emit).not.toHaveBeenCalledWith('order.cancelled', expect.anything());
    });
  });
});
