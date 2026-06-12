import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('login_logs')
export class LoginLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', nullable: true })
  userId: number;

  @Column({ name: 'username', length: 50 })
  username: string;

  @Column({ name: 'ip_address', length: 50, default: '' })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', default: '' })
  userAgent: string;

  @Column({ length: 20, default: 'success' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
