import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('quotation_items')
export class QuotationItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'quotation_id' })
  quotationId: number;

  @Column({ name: 'part_id' })
  partId: number;

  @Column({ name: 'oe_number' })
  oeNumber: string;

  @Column({ name: 'part_name' })
  partName: string;

  @Column()
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @Column({ default: '' })
  brand: string;

  @Column({ name: 'package_name', default: '' })
  packageName: string;

  @Column({ default: 'pcs' })
  unit: string;
}
