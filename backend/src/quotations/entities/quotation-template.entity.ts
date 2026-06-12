import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('quotation_templates')
export class QuotationTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'template_name' })
  templateName: string;

  @Column({ name: 'header_text', default: '' })
  headerText: string;

  @Column({ name: 'footer_text', default: '' })
  footerText: string;

  @Column({ name: 'terms_text', default: '' })
  termsText: string;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ name: 'include_image', default: true })
  includeImage: boolean;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
