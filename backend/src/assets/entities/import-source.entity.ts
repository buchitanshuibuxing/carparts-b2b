import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('import_sources')
export class ImportSource {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 20 })
  protocol: string; // webdav / ftp / smb_mount

  @Column({ type: 'text', nullable: true })
  url: string;

  @Column({ length: 255, default: '' })
  username: string;

  @Column({ length: 255, default: '' })
  password: string;

  @Column({ name: 'local_mount_path', type: 'text', nullable: true })
  localMountPath: string;

  @Column({ name: 'remote_path', type: 'text', default: '/' })
  remotePath: string;

  @Column({ name: 'auto_classify', default: true })
  autoClassify: boolean;

  @Column({ name: "auto_recognize", default: false })
  autoRecognize: boolean; // Auto OCR/AI recognition on import

  @Column({ name: 'folder_mapping', type: 'jsonb', default: {} })
  folderMapping: Record<string, number>;

  @Column({ name: 'scan_interval', type: 'int', default: 0 })
  scanInterval: number; // minutes, 0 = disabled

  @Column({ name: 'last_scan_at', type: 'timestamptz', nullable: true })
  lastScanAt: Date;

  @Column({ name: 'last_sync_at', type: 'timestamptz', nullable: true })
  lastSyncAt: Date;

  @Column({ length: 20, default: 'idle' })
  status: string; // idle / scanning / importing / error

  @Column({ name: 'error_message', type: 'text', default: '' })
  errorMessage: string;

  @Column({ name: 'import_progress', type: 'jsonb', nullable: true })
  importProgress: { imported: number; skipped: number; errors: number; total: number; currentFile: string; fileLog?: any[] } | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
