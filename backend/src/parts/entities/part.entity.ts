import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { PartClassification } from './part-classification.entity';

@Entity('parts')
export class Part {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'oe_number', unique: true })
  oeNumber: string;

  @Column({ name: 'part_name_cn' })
  partNameCn: string;

  @Column({ name: 'part_name_en', default: '' })
  partNameEn: string;

  @Column({ name: 'part_name_ko', default: '' })
  partNameKo: string;

  @Column({ default: '其他' })
  category: string;

  @Column({ name: 'sub_category', default: '' })
  subCategory: string;

  @Column({ default: '' })
  brand: string;

  @Column({ name: 'car_model', default: '' })
  carModel: string;

  @Column({ name: 'engine_type', default: '' })
  engineType: string;

  @Column({ name: 'model_year_from', nullable: true })
  modelYearFrom: number;

  @Column({ name: 'model_year_to', nullable: true })
  modelYearTo: number;

  @Column({ name: 'part_type', default: 'OEM' })
  partType: string;

  @Column({ type: 'jsonb', default: {} })
  specifications: Record<string, any>;

  @Column({ default: '个' })
  unit: string;

  @Column({ name: 'weight_kg', type: 'decimal', precision: 10, scale: 3, default: 0 })
  weightKg: number;

  @Column({ name: 'dimensions_cm', default: '' })
  dimensionsCm: string;

  @Column({ name: 'hs_code', default: '' })
  hsCode: string;

  @Column({ default: '' })
  notes: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: number;

  @Column({ name: 'classification_id', nullable: true })
  classificationId: number;

  @ManyToOne(() => PartClassification, { nullable: true, createForeignKeyConstraints: false })
  @JoinColumn({ name: 'classification_id' })
  classification: PartClassification;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
