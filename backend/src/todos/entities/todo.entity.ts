import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('todos')
export class Todo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 500 })
  content: string;

  @Column({ type: 'varchar', length: 20, default: 'normal' })
  priority: string;

  @Column({ name: 'is_done', default: false })
  isDone: boolean;

  @Column({ name: 'tag', type: 'varchar', length: 50, nullable: true })
  tag: string | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
