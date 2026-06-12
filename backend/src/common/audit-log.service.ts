import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AuditLogService {
  constructor(private dataSource: DataSource) {}

  async log(userId: number | null, action: string, entityType: string, entityId: number, oldValue?: any, newValue?: any) {
    try {
      await this.dataSource.query(
        'INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_value, new_value) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, action, entityType, entityId, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null]
      );
    } catch (err) {
      console.error('Audit log error:', err);
    }
  }
}
