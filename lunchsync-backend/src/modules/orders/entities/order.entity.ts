import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Provider } from '../../providers/entities/provider.entity';
import { User } from '../../users/entities/user.entity';
import { DailyMenu } from '../../menus/daily-menus/entities/daily-menu.entity';
import { DeliveryZone } from '../../delivery-zones/entities/delivery-zone.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 20, name: 'order_number', unique: true })
  orderNumber!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'uuid', name: 'provider_id' })
  providerId!: string;

  @ManyToOne(() => Provider)
  @JoinColumn({ name: 'provider_id' })
  provider!: Provider;

  @Column({ type: 'uuid', name: 'daily_menu_id' })
  dailyMenuId!: string;

  @ManyToOne(() => DailyMenu)
  @JoinColumn({ name: 'daily_menu_id' })
  dailyMenu!: DailyMenu;

  @Column({ type: 'uuid', name: 'delivery_zone_id' })
  deliveryZoneId!: string;

  @ManyToOne(() => DeliveryZone)
  @JoinColumn({ name: 'delivery_zone_id' })
  deliveryZone!: DeliveryZone;

  @Column({ type: 'varchar', length: 150, name: 'employee_name' })
  employeeName!: string;

  @Column({ type: 'varchar', length: 20, name: 'employee_phone' })
  employeePhone!: string;

  @Column({ type: 'varchar', length: 150, name: 'provider_name' })
  providerName!: string;

  @Column({ type: 'varchar', length: 100, name: 'delivery_zone_name' })
  deliveryZoneName!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_amount' })
  totalAmount!: number;

  @Column({ type: 'varchar', length: 50, name: 'order_status', default: 'pending' })
  orderStatus!: string;

  @Column({ type: 'varchar', length: 50, name: 'payment_status', default: 'unpaid' })
  paymentStatus!: string;

  @Column({ type: 'text', name: 'special_instructions', nullable: true })
  specialInstructions!: string | null;

  @Column({ type: 'timestamptz', name: 'confirmed_at', nullable: true })
  confirmedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
