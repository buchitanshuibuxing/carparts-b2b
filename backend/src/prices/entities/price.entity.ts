import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('prices')
export class Price {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'part_id' })
  partId: number;

  @Column({ name: 'price_type', default: '批发价' })
  priceType: string;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 })
  unitPrice: number;

  @Column({ name: 'min_quantity', default: 1 })
  minQuantity: number;

  @Column({ name: 'max_quantity', default: 99999 })
  maxQuantity: number;

  @Column({ name: 'effective_date', default: '' })
  effectiveDate: string;

  @Column({ name: 'expiry_date', default: '' })
  expiryDate: string;

  @Column({ default: '' })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
