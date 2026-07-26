import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentRepo: jest.Mocked<Repository<Payment>>;
  let orderRepo: jest.Mocked<Repository<Order>>;

  const mockOrder: Partial<Order> = {
    id: 'order-uuid-1',
    providerId: 'provider-uuid-1',
    totalAmount: 15000,
    paymentStatus: 'unpaid',
    orderNumber: 'ORD-TEST-001',
    employeeName: 'Juan Perez',
  };

  const mockPayment: Partial<Payment> = {
    id: 'payment-uuid-1',
    orderId: 'order-uuid-1',
    providerId: 'provider-uuid-1',
    userId: 'user-uuid-1',
    amount: 15000,
    paymentMethod: 'cash',
    status: 'confirmed',
    proofImageUrl: null,
    employeeNote: null,
    confirmedBy: null,
    confirmedAt: new Date(),
    createdAt: new Date(),
  };

  const mockTransferPayment: Partial<Payment> = {
    id: 'payment-uuid-2',
    orderId: 'order-uuid-1',
    providerId: 'provider-uuid-1',
    userId: 'user-uuid-1',
    amount: 15000,
    paymentMethod: 'transfer',
    status: 'pending',
    proofImageUrl: '/uploads/proofs/proof.jpg',
    employeeNote: 'Transferí ayer',
    confirmedBy: null,
    confirmedAt: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockPaymentRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockOrderRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Payment), useValue: mockPaymentRepo },
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    paymentRepo = module.get(getRepositoryToken(Payment));
    orderRepo = module.get(getRepositoryToken(Order));
  });

  describe('create', () => {
    it('should create a cash payment and auto-confirm it', async () => {
      orderRepo.findOne.mockResolvedValue(mockOrder as Order);
      paymentRepo.create.mockReturnValue(mockPayment as Payment);
      paymentRepo.save.mockResolvedValue(mockPayment as Payment);
      orderRepo.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.create(
        'user-uuid-1',
        'provider-uuid-1',
        { orderId: 'order-uuid-1', paymentMethod: 'cash' },
      );

      expect(result.status).toBe('confirmed');
      expect(result.paymentMethod).toBe('cash');
      expect(orderRepo.update).toHaveBeenCalledWith('order-uuid-1', { paymentStatus: 'paid' });
    });

    it('should create a transfer payment as pending with proof image', async () => {
      orderRepo.findOne.mockResolvedValue(mockOrder as Order);
      paymentRepo.create.mockReturnValue(mockTransferPayment as Payment);
      paymentRepo.save.mockResolvedValue(mockTransferPayment as Payment);

      const result = await service.create(
        'user-uuid-1',
        'provider-uuid-1',
        { orderId: 'order-uuid-1', paymentMethod: 'transfer', employeeNote: 'Transferí ayer' },
        '/uploads/proofs/proof.jpg',
      );

      expect(result.status).toBe('pending');
      expect(result.paymentMethod).toBe('transfer');
      expect(result.proofImageUrl).toBe('/uploads/proofs/proof.jpg');
      expect(result.employeeNote).toBe('Transferí ayer');
      expect(orderRepo.update).not.toHaveBeenCalled();
    });

    it('should throw if order not found', async () => {
      orderRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create('user-uuid-1', 'provider-uuid-1', {
          orderId: 'nonexistent',
          paymentMethod: 'cash',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if order already paid', async () => {
      orderRepo.findOne.mockResolvedValue({ ...mockOrder, paymentStatus: 'paid' } as Order);

      await expect(
        service.create('user-uuid-1', 'provider-uuid-1', {
          orderId: 'order-uuid-1',
          paymentMethod: 'cash',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if transfer without proof image', async () => {
      orderRepo.findOne.mockResolvedValue(mockOrder as Order);

      await expect(
        service.create('user-uuid-1', 'provider-uuid-1', {
          orderId: 'order-uuid-1',
          paymentMethod: 'transfer',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should include employee note when provided', async () => {
      orderRepo.findOne.mockResolvedValue(mockOrder as Order);
      paymentRepo.create.mockReturnValue({ ...mockPayment, employeeNote: 'Sin picante' } as Payment);
      paymentRepo.save.mockResolvedValue({ ...mockPayment, employeeNote: 'Sin picante' } as Payment);
      orderRepo.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.create(
        'user-uuid-1',
        'provider-uuid-1',
        { orderId: 'order-uuid-1', paymentMethod: 'cash', employeeNote: 'Sin picante' },
      );

      expect(result.employeeNote).toBe('Sin picante');
    });
  });

  describe('confirm', () => {
    it('should confirm a pending transfer payment', async () => {
      const pendingPayment = { ...mockTransferPayment, status: 'pending' } as Payment;
      paymentRepo.findOne.mockResolvedValue(pendingPayment);
      paymentRepo.save.mockImplementation(async (p) => ({ ...p, confirmedBy: 'provider-account-uuid-1', confirmedAt: new Date() }) as Payment);
      orderRepo.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.confirm(
        'payment-uuid-2',
        'provider-uuid-1',
        { status: 'confirmed' },
        'provider-account-uuid-1',
      );

      expect(result.status).toBe('confirmed');
      expect(result.confirmedBy).toBe('provider-account-uuid-1');
      expect(orderRepo.update).toHaveBeenCalledWith('order-uuid-1', { paymentStatus: 'paid' });
    });

    it('should reject a pending transfer payment', async () => {
      const pendingPayment = { ...mockTransferPayment, status: 'pending' } as Payment;
      paymentRepo.findOne.mockResolvedValue(pendingPayment);
      paymentRepo.save.mockImplementation(async (p) => ({
        ...p,
        status: 'rejected',
        rejectionReason: 'Monto incorrecto',
      }) as Payment);
      orderRepo.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.confirm(
        'payment-uuid-2',
        'provider-uuid-1',
        { status: 'rejected', rejectionReason: 'Monto incorrecto' },
        'provider-account-uuid-1',
      );

      expect(result.status).toBe('rejected');
      expect(result.rejectionReason).toBe('Monto incorrecto');
      expect(orderRepo.update).toHaveBeenCalledWith('order-uuid-1', { paymentStatus: 'unpaid' });
    });

    it('should throw if payment not found', async () => {
      paymentRepo.findOne.mockResolvedValue(null);

      await expect(
        service.confirm('nonexistent', 'provider-uuid-1', { status: 'confirmed' }, 'provider-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if payment already processed', async () => {
      paymentRepo.findOne.mockResolvedValue({ ...mockTransferPayment, status: 'confirmed' } as Payment);

      await expect(
        service.confirm('payment-uuid-2', 'provider-uuid-1', { status: 'confirmed' }, 'provider-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByUser', () => {
    it('should return payments for a user', async () => {
      paymentRepo.find.mockResolvedValue([mockPayment as Payment, mockTransferPayment as Payment]);

      const result = await service.findByUser('user-uuid-1', 'provider-uuid-1');

      expect(result).toHaveLength(2);
      expect(paymentRepo.find).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1', providerId: 'provider-uuid-1' },
        relations: { order: true },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array if no payments', async () => {
      paymentRepo.find.mockResolvedValue([]);

      const result = await service.findByUser('user-uuid-1', 'provider-uuid-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('findByProvider', () => {
    it('should return all payments for a provider', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockPayment, mockTransferPayment]),
      };
      paymentRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.findByProvider('provider-uuid-1');

      expect(result).toHaveLength(2);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('p.provider_id = :providerId', { providerId: 'provider-uuid-1' });
    });

    it('should filter by status', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockTransferPayment]),
      };
      paymentRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.findByProvider('provider-uuid-1', { status: 'pending' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('p.status = :status', { status: 'pending' });
    });

    it('should filter by employee name with ILIKE', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockPayment]),
      };
      paymentRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.findByProvider('provider-uuid-1', { employeeName: 'Juan' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.full_name ILIKE :name', { name: '%Juan%' });
    });

    it('should filter by date range', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      paymentRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.findByProvider('provider-uuid-1', {
        dateFrom: '2026-07-20',
        dateTo: '2026-07-26',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('p.created_at >= :dateFrom', { dateFrom: expect.any(Date) });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('p.created_at <= :dateTo', { dateTo: expect.any(Date) });
    });
  });

  describe('getSummary', () => {
    it('should return payment summary grouped by method and status', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { method: 'cash', status: 'confirmed', count: '5', total: '75000' },
          { method: 'transfer', status: 'pending', count: '2', total: '30000' },
        ]),
      };
      paymentRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getSummary('provider-uuid-1');

      expect(result).toHaveLength(2);
      expect(result[0].method).toBe('cash');
      expect(result[0].count).toBe('5');
    });

    it('should filter by date range in summary', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      paymentRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getSummary('provider-uuid-1', '2026-07-20', '2026-07-26');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('p.created_at >= :dateFrom', { dateFrom: expect.any(Date) });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('p.created_at <= :dateTo', { dateTo: expect.any(Date) });
    });
  });
});
