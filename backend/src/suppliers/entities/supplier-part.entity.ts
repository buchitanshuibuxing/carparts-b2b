import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('supplier_parts')
export class SupplierPart {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'supplier_id' })
  supplierId: number;

  @Column({ name: 'part_id' })
  partId: number;

  @Column({ name: 'supplier_sku', default: '' })
  supplierSku: string;

  @Column({ default: 1 })
  moq: number;

  @Column({ name: 'lead_time_days', default: 0 })
  leadTimeDays: number;

  @Column({ default: '' })
  notes: string;
}
