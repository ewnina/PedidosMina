import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { MenuService } from '../../menu-services/entities/menu-service.entity';

@Entity('combo_groups')
export class ComboGroup {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'menu_service_id' })
  menuServiceId!: string;

  @ManyToOne(() => MenuService, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_service_id' })
  menuService!: MenuService;

  @Column({ type: 'varchar', length: 100, name: 'group_name' })
  groupName!: string;

  @Column({ type: 'boolean', name: 'is_required', default: true })
  isRequired!: boolean;

  @Column({ type: 'int', name: 'min_select', default: 1 })
  minSelect!: number;

  @Column({ type: 'int', name: 'max_select', default: 1 })
  maxSelect!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
