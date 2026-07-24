import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ComboGroup } from '../../combo-groups/entities/combo-group.entity';

@Entity('combo_options')
export class ComboOption {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'combo_group_id' })
  comboGroupId!: string;

  @ManyToOne(() => ComboGroup, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'combo_group_id' })
  comboGroup!: ComboGroup;

  @Column({ type: 'varchar', length: 150, name: 'option_name' })
  optionName!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'extra_price', default: 0.00 })
  extraPrice!: number;

  @Column({ type: 'int', name: 'initial_stock', nullable: true })
  initialStock!: number | null;

  @Column({ type: 'int', name: 'stock_quantity', nullable: true })
  stockQuantity!: number | null;

  @Column({ type: 'boolean', name: 'is_unlimited', default: true })
  isUnlimited!: boolean;

  @Column({ type: 'boolean', name: 'is_available', default: true })
  isAvailable!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
