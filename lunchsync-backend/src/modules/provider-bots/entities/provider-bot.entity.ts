import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Provider } from '../../providers/entities/provider.entity';

@Entity('provider_bots')
export class ProviderBot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'provider_id' })
  providerId!: string;

  @ManyToOne(() => Provider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider!: Provider;

  @Column({ type: 'varchar', length: 100, name: 'whatsapp_group_id' })
  whatsappGroupId!: string;

  @Column({ type: 'varchar', length: 500, name: 'session_folder_path', nullable: true })
  sessionFolderPath!: string | null;

  @Column({ type: 'varchar', length: 200, name: 'session_folder_name', nullable: true })
  sessionFolderName!: string | null;

  @Column({ type: 'varchar', length: 50, name: 'client_version', nullable: true })
  clientVersion!: string | null;

  @Column({ type: 'boolean', name: 'is_online', default: false })
  isOnline!: boolean;

  @Column({ type: 'timestamptz', name: 'last_connected_at', nullable: true })
  lastConnectedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'last_disconnected_at', nullable: true })
  lastDisconnectedAt!: Date | null;

  @Column({ type: 'text', name: 'disconnect_reason', nullable: true })
  disconnectReason!: string | null;

  @Column({ type: 'timestamptz', name: 'last_qr_generated_at', nullable: true })
  lastQrGeneratedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'last_message_at', nullable: true })
  lastMessageAt!: Date | null;

  @Column({ type: 'varchar', length: 50, name: 'bot_status', default: 'disconnected' })
  botStatus!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
