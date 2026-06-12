import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('facebook_pages')
export class FacebookPage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'page_id', length: 50, unique: true })
  pageId: string;

  @Column({ name: 'page_name', length: 255 })
  pageName: string;

  @Column({ name: 'access_token', type: 'text' })
  accessToken: string;

  @Column({ name: 'token_expires', type: 'timestamptz', nullable: true })
  tokenExpires: Date;

  @Column({ name: 'profile_picture', length: 500, default: '' })
  profilePicture: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'connected_by', nullable: true })
  connectedBy: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
