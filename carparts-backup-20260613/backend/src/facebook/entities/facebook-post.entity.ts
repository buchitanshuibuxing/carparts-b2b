import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('facebook_posts')
export class FacebookPost {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'page_id' })
  pageId: number;

  @Column({ name: 'fb_post_id', length: 50, nullable: true })
  fbPostId: string;

  @Column({ type: 'text', default: '' })
  message: string;

  @Column({ name: 'image_asset_ids', type: 'simple-json', default: '[]' })
  imageAssetIds: number[];

  @Column({ length: 20, default: 'draft' })
  status: string;

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date;

  @Column({ name: 'likes_count', default: 0 })
  likesCount: number;

  @Column({ name: 'comments_count', default: 0 })
  commentsCount: number;

  @Column({ name: 'shares_count', default: 0 })
  sharesCount: number;

  @Column({ name: 'error_message', default: '' })
  errorMessage: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
