import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { DailyMenu } from '../../daily-menus/entities/daily-menu.entity';

@Entity('menu_services')
export class MenuService {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'daily_menu_id' })
  dailyMenuId!: string;

  @ManyToOne(() => DailyMenu, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'daily_menu_id' })
  dailyMenu!: DailyMenu;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'base_price', default: 0.00 })
  basePrice!: number;

  @Column({ type: 'int', name: 'total_stock', nullable: true })
  totalStock!: number | null;

  @Column({ type: 'int', name: 'remaining_stock', nullable: true })
  remainingStock!: number | null;

  @Column({ type: 'boolean', name: 'is_available', default: true })
  isAvailable!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
