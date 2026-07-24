import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Provider } from '../../providers/entities/provider.entity';
import { Order } from '../../orders/entities/order.entity';

@Entity('whatsapp_logs')
export class WhatsappLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'provider_id' })
  providerId!: string;

  @ManyToOne(() => Provider)
  @JoinColumn({ name: 'provider_id' })
  provider!: Provider;

  @Column({ type: 'uuid', name: 'order_id', nullable: true })
  orderId!: string | null;

  @ManyToOne(() => Order, { nullable: true })
  @JoinColumn({ name: 'order_id' })
  order!: Order | null;

  @Column({ type: 'varchar', length: 100, name: 'recipient_phone_or_group' })
  recipientPhoneOrGroup!: string;

  @Column({ type: 'varchar', length: 50, name: 'message_type' })
  messageType!: string;

  @Column({ type: 'text', name: 'message_payload' })
  messagePayload!: string;

  @Column({ type: 'text', name: 'response_payload', nullable: true })
  responsePayload!: string | null;

  @Column({ type: 'text', name: 'error_message', nullable: true })
  errorMessage!: string | null;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ type: 'varchar', length: 50, default: 'sent' })
  status!: string;

  @CreateDateColumn({ name: 'sent_at', type: 'timestamptz' })
  sentAt!: Date;
}
