import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('image_assets')
export class ImageAsset {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'part_id', nullable: true })
  partId: number;

  @Column({ name: 'file_path' })
  filePath: string;

  @Column({ name: 'file_name' })
  fileName: string;

  @Column({ name: 'file_md5', length: 32, nullable: true })
  fileMd5: string;

  @Column({ name: 'file_size', default: 0 })
  fileSize: number;

  @Column({ default: 0 })
  width: number;

  @Column({ default: 0 })
  height: number;

  @Column({ length: 20, default: 'image' })
  type: string;

  @Column({ name: 'mime_type', length: 50, default: 'image/jpeg' })
  mimeType: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  duration: number;

  @Column({ name: 'ocr_text', default: '' })
  ocrText: string;

  @Column({ name: 'ocr_status', length: 20, default: 'pending' })
  ocrStatus: string;

  @Column({ default: '' })
  tags: string;

  @Column({ default: '' })
  category: string;

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ name: 'classification_id', nullable: true })
  classificationId: number;

  @Column({ name: 'thumbnail_small_path', length: 500, default: '' })
  thumbnailSmallPath: string;

  @Column({ name: 'thumbnail_medium_path', length: 500, default: '' })
  thumbnailMediumPath: string;

  @Column({ name: 'thumbnail_large_path', length: 500, default: '' })
  thumbnailLargePath: string;

  @Column({ name: 'recognition_status', length: 20, default: 'pending' })
  recognitionStatus: string;

  @Column({ name: 'recognized_oe_number', default: '' })
  recognizedOeNumber: string;

  @Column({ name: 'recognized_part_type', default: '' })
  recognizedPartType: string;

  @Column({ name: 'recognized_brand', default: '' })
  recognizedBrand: string;

  @Column({ name: 'part_name_cn', default: '' })
  partNameCn: string;

  @Column({ name: 'part_name_en', default: '' })
  partNameEn: string;

  @Column({ name: 'recognition_confidence', type: 'decimal', precision: 3, scale: 2, default: 0 })
  recognitionConfidence: number;

  @Column({ name: 'recognition_result', type: 'jsonb', default: {} })
  recognitionResult: Record<string, any>;

  @Column({ name: 'uploaded_by', nullable: true })
  uploadedBy: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
