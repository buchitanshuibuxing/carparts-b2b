import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('price_log')
export class PriceLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'price_id' })
  priceId: number;

  @Column({ name: 'old_price', type: 'decimal', precision: 12, scale: 2 })
  oldPrice: number;

  @Column({ name: 'new_price', type: 'decimal', precision: 12, scale: 2 })
  newPrice: number;

  @Column({ name: 'change_reason', default: '' })
  changeReason: string;

  @Column({ default: 'system' })
  operator: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
