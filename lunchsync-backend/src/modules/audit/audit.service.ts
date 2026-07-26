import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditContext {
  providerId?: string;
  userId?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(
    ctx: AuditContext,
    entity: string,
    action: string,
    entityId?: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const entry = this.auditRepo.create({
        providerId: ctx.providerId ?? null,
        userId: ctx.userId ?? null,
        entity,
        entityId: entityId ?? null,
        action,
        oldValues: oldValues ?? null,
        newValues: newValues ?? null,
      });
      await this.auditRepo.save(entry);
    } catch (error) {
      this.logger.error(`Audit log failed: ${entity}.${action}`, error);
    }
  }
}
