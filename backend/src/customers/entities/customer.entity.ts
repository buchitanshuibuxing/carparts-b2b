import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_code', unique: true, nullable: true })
  customerCode: string;

  @Column({ name: 'company_name' })
  companyName: string;

  @Column({ name: 'contact_person', default: '' })
  contactPerson: string;

  @Column({ default: '' })
  phone: string;

  @Column({ default: '' })
  email: string;

  @Column({ default: '' })
  address: string;

  @Column({ default: '' })
  country: string;

  @Column({ default: '' })
  region: string;

  @Column({ name: 'customer_type', default: '经销商' })
  customerType: string;

  @Column({ name: 'customer_level', default: '普通' })
  customerLevel: string;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ name: 'credit_limit', type: 'decimal', precision: 12, scale: 2, default: 0 })
  creditLimit: number;

  @Column({ name: 'payment_terms', default: '' })
  paymentTerms: string;

  @Column({ default: '' })
  notes: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
