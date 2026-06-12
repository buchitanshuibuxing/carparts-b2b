import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('inventory_log')
export class InventoryLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'part_id' })
  partId: number;

  @Column({ name: 'change_type', length: 10 })
  changeType: string;

  @Column({ name: 'quantity_change' })
  quantityChange: number;

  @Column({ name: 'quantity_before' })
  quantityBefore: number;

  @Column({ name: 'quantity_after' })
  quantityAfter: number;

  @Column({ default: '' })
  reason: string;

  @Column({ name: 'reference_type', length: 20, default: '' })
  referenceType: string;

  @Column({ name: 'reference_id', nullable: true })
  referenceId: number;

  @Column({ name: 'operator_id', nullable: true })
  operatorId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
