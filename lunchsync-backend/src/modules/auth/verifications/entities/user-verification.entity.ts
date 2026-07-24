import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { AuthToken } from '../../tokens/entities/auth-token.entity';

@Entity('user_verifications')
export class UserVerification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'auth_token_id' })
  authTokenId!: string;

  @ManyToOne(() => AuthToken, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auth_token_id' })
  authToken!: AuthToken;

  @Column({ type: 'varchar', length: 50, name: 'verification_type', nullable: true })
  verificationType!: string | null;

  @Column({ type: 'varchar', length: 255, name: 'code_hash', nullable: true })
  codeHash!: string | null;

  @Column({ type: 'timestamptz', name: 'expires_at', nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'verified_at', nullable: true })
  verifiedAt!: Date | null;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
