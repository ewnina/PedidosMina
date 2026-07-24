import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { MenuService } from '../../../menus/menu-services/entities/menu-service.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'order_id' })
  orderId!: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ type: 'uuid', name: 'menu_service_id' })
  menuServiceId!: string;

  @ManyToOne(() => MenuService)
  @JoinColumn({ name: 'menu_service_id' })
  menuService!: MenuService;

  @Column({ type: 'varchar', length: 150, name: 'service_name' })
  serviceName!: string;

  @Column({ type: 'text', name: 'service_description', nullable: true })
  serviceDescription!: string | null;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'unit_price' })
  unitPrice!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
