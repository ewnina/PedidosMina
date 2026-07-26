import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async create(userId: string, providerId: string, dto: CreatePaymentDto, proofImageUrl?: string): Promise<Payment> {
    const order = await this.orderRepo.findOne({ where: { id: dto.orderId, providerId } });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    if (order.paymentStatus === 'paid') {
      throw new BadRequestException('Este pedido ya fue pagado');
    }

    if (dto.paymentMethod === 'transfer' && !proofImageUrl) {
      throw new BadRequestException('La transferencia requiere comprobante de pago');
    }

    const payment = this.paymentRepo.create({
      orderId: dto.orderId,
      providerId,
      userId,
      amount: Number(order.totalAmount),
      paymentMethod: dto.paymentMethod,
      status: dto.paymentMethod === 'cash' ? 'confirmed' : 'pending',
      proofImageUrl: proofImageUrl ?? null,
      employeeNote: dto.employeeNote ?? null,
      confirmedAt: dto.paymentMethod === 'cash' ? new Date() : null,
    });

    const saved = await this.paymentRepo.save(payment);

    if (dto.paymentMethod === 'cash') {
      await this.orderRepo.update(order.id, { paymentStatus: 'paid' });
    }

    this.logger.log(`Payment created: ${saved.id} (${dto.paymentMethod}) for order ${dto.orderId}`);
    return saved;
  }

  async confirm(paymentId: string, providerId: string, dto: ConfirmPaymentDto, confirmedBy: string): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId, providerId } });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (payment.status !== 'pending') {
      throw new BadRequestException('Este pago ya fue procesado');
    }

    payment.status = dto.status;
    payment.confirmedBy = confirmedBy;
    payment.confirmedAt = new Date();
    payment.rejectionReason = dto.rejectionReason ?? null;

    const saved = await this.paymentRepo.save(payment);

    const newPaymentStatus = dto.status === 'confirmed' ? 'paid' : 'unpaid';
    await this.orderRepo.update(payment.orderId, { paymentStatus: newPaymentStatus });

    this.logger.log(`Payment ${paymentId} ${dto.status} by ${confirmedBy}`);
    return saved;
  }

  async findByUser(userId: string, providerId: string): Promise<Payment[]> {
    return this.paymentRepo.find({
      where: { userId, providerId },
      relations: { order: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findByProvider(providerId: string, filters?: { status?: string; dateFrom?: string; dateTo?: string; employeeName?: string }): Promise<Payment[]> {
    const query = this.paymentRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'user')
      .leftJoinAndSelect('p.order', 'order')
      .where('p.provider_id = :providerId', { providerId });

    if (filters?.status) {
      query.andWhere('p.status = :status', { status: filters.status });
    }

    if (filters?.dateFrom) {
      query.andWhere('p.created_at >= :dateFrom', { dateFrom: new Date(filters.dateFrom) });
    }
    if (filters?.dateTo) {
      query.andWhere('p.created_at <= :dateTo', { dateTo: new Date(filters.dateTo) });
    }

    if (filters?.employeeName) {
      query.andWhere('user.full_name ILIKE :name', { name: `%${filters.employeeName}%` });
    }

    query.orderBy('p.created_at', 'DESC');

    return query.getMany();
  }

  async getSummary(providerId: string, dateFrom?: string, dateTo?: string) {
    const query = this.paymentRepo.createQueryBuilder('p')
      .select('p.payment_method', 'method')
      .addSelect('p.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(p.amount)', 'total')
      .where('p.provider_id = :providerId', { providerId });

    if (dateFrom) {
      query.andWhere('p.created_at >= :dateFrom', { dateFrom: new Date(dateFrom) });
    }
    if (dateTo) {
      query.andWhere('p.created_at <= :dateTo', { dateTo: new Date(dateTo) });
    }

    query.groupBy('p.payment_method').addGroupBy('p.status');

    return query.getRawMany();
  }
}
