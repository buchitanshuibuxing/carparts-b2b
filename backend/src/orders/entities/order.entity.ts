import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_number', unique: true })
  orderNumber: string;

  @Column({ name: 'quotation_number', nullable: true })
  quotationNumber: string;

  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({ name: 'order_date', type: 'timestamptz', default: () => 'NOW()' })
  orderDate: Date;

  @Column({ default: 'pending' })
  status: string;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ name: 'paid_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ name: 'shipping_method', default: '' })
  shippingMethod: string;

  @Column({ name: 'shipping_address', default: '' })
  shippingAddress: string;

  @Column({ name: 'shipping_cost', type: 'decimal', precision: 12, scale: 2, default: 0 })
  shippingCost: number;

  @Column({ name: 'tracking_number', default: '' })
  trackingNumber: string;

  @Column({ name: 'estimated_date', type: 'timestamptz', nullable: true })
  estimatedDate: Date;

  @Column({ name: 'actual_date', type: 'timestamptz', nullable: true })
  actualDate: Date;

  @Column({ default: '' })
  notes: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
