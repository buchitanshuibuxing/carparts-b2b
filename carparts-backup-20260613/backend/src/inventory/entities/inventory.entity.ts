import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('inventory')
export class Inventory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'part_id', unique: true })
  partId: number;

  @Column({ default: 0 })
  quantity: number;

  @Column({ name: 'reserved_quantity', default: 0 })
  reservedQuantity: number;

  @Column({ name: 'warehouse_location', default: '' })
  warehouseLocation: string;

  @Column({ name: 'warehouse_zone', default: '默认' })
  warehouseZone: string;

  @Column({ name: 'min_stock', default: 0 })
  minStock: number;

  @Column({ name: 'max_stock', default: 99999 })
  maxStock: number;

  @Column({ name: 'last_stock_check', type: 'timestamptz', nullable: true })
  lastStockCheck: Date;

  @Column({ name: 'last_restock_date', type: 'timestamptz', nullable: true })
  lastRestockDate: Date;

  @Column({ default: '' })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
