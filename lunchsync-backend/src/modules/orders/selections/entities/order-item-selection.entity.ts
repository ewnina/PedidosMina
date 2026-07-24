import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { OrderItem } from '../../items/entities/order-item.entity';
import { ComboGroup } from '../../../menus/combo-groups/entities/combo-group.entity';
import { ComboOption } from '../../../menus/combo-options/entities/combo-option.entity';

@Entity('order_item_selections')
export class OrderItemSelection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'order_item_id' })
  orderItemId!: string;

  @ManyToOne(() => OrderItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_item_id' })
  orderItem!: OrderItem;

  @Column({ type: 'uuid', name: 'combo_group_id' })
  comboGroupId!: string;

  @ManyToOne(() => ComboGroup)
  @JoinColumn({ name: 'combo_group_id' })
  comboGroup!: ComboGroup;

  @Column({ type: 'uuid', name: 'combo_option_id' })
  comboOptionId!: string;

  @ManyToOne(() => ComboOption)
  @JoinColumn({ name: 'combo_option_id' })
  comboOption!: ComboOption;

  @Column({ type: 'varchar', length: 100, name: 'group_name' })
  groupName!: string;

  @Column({ type: 'varchar', length: 150, name: 'option_name' })
  optionName!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
