import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { Provider } from '../../providers/entities/provider.entity';
import { User } from '../../users/entities/user.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'order_id' })
  orderId!: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ type: 'uuid', name: 'provider_id' })
  providerId!: string;

  @ManyToOne(() => Provider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider!: Provider;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'amount' })
  amount!: number;

  @Column({ type: 'varchar', length: 30, name: 'payment_method' })
  paymentMethod!: string;

  @Column({ type: 'varchar', length: 30, default: 'pending' })
  status!: string;

  @Column({ type: 'text', name: 'proof_image_url', nullable: true })
  proofImageUrl!: string | null;

  @Column({ type: 'text', name: 'rejection_reason', nullable: true })
  rejectionReason!: string | null;

  @Column({ type: 'text', name: 'employee_note', nullable: true })
  employeeNote!: string | null;

  @Column({ type: 'uuid', name: 'confirmed_by', nullable: true })
  confirmedBy!: string | null;

  @Column({ type: 'timestamptz', name: 'confirmed_at', nullable: true })
  confirmedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
