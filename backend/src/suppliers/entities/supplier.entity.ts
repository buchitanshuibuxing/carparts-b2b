import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'supplier_code', unique: true })
  supplierCode: string;

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

  @Column({ name: 'payment_terms', default: '' })
  paymentTerms: string;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ name: 'lead_time_days', default: 0 })
  leadTimeDays: number;

  @Column({ default: 0 })
  rating: number;

  @Column({ default: '' })
  notes: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'main_products', length: 500, default: '' })
  mainProducts: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
