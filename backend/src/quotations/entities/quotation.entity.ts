import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('quotations')
export class Quotation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'quotation_number', unique: true })
  quotationNumber: string;

  @Column({ name: 'template_id', nullable: true })
  templateId: number;

  @Column({ name: 'customer_id', nullable: true })
  customerId: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ default: 'draft' })
  status: string;

  @Column({ default: '' })
  remark: string;

  @Column({ name: 'pdf_path', default: '' })
  pdfPath: string;

  @Column({ name: 'seller_company', default: '' })
  sellerCompany: string;

  @Column({ name: 'seller_contact', default: '' })
  sellerContact: string;

  @Column({ name: 'seller_phone', default: '' })
  sellerPhone: string;

  @Column({ name: 'seller_email', default: '' })
  sellerEmail: string;

  @Column({ name: 'seller_address', default: '' })
  sellerAddress: string;

  @Column({ name: 'logo_url', default: '' })
  logoUrl: string;

  @Column({ name: 'buyer_company', default: '' })
  buyerCompany: string;

  @Column({ name: 'buyer_contact', default: '' })
  buyerContact: string;

  @Column({ name: 'buyer_phone', default: '' })
  buyerPhone: string;

  @Column({ name: 'buyer_email', default: '' })
  buyerEmail: string;

  @Column({ name: 'buyer_address', default: '' })
  buyerAddress: string;

  @Column({ name: 'trade_terms', default: '' })
  tradeTerms: string;

  @Column({ name: 'port_loading', default: '' })
  portLoading: string;

  @Column({ name: 'port_dest', default: '' })
  portDest: string;

  @Column({ name: 'delivery_time', default: '' })
  deliveryTime: string;

  @Column({ name: 'valid_until', nullable: true })
  validUntil: Date;

  @Column({ name: 'discount_pct', type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPct: number;

  @Column({ name: 'shipping_cost', type: 'decimal', precision: 12, scale: 2, default: 0 })
  shippingCost: number;

  @Column({ name: 'payment_stages', type: 'jsonb', default: () => "'[]'" })
  paymentStages: any[];

  @Column({ name: 'payment_account_id', nullable: true })
  paymentAccountId: number;

  @Column({ default: '' })
  notes: string;

  @Column({ name: 'header_text', default: '' })
  headerText: string;

  @Column({ name: 'footer_text', default: '' })
  footerText: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
