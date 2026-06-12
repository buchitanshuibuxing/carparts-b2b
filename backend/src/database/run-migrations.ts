import { DataSource } from 'typeorm';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'carparts',
  password: process.env.DB_PASSWORD || 'carparts123',
  database: process.env.DB_NAME || 'carparts',
});

async function runMigrations() {
  await dataSource.initialize();
  console.log('Connected to PostgreSQL');

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    console.log(`Running migration: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    try {
      await dataSource.query(sql);
      console.log(`  ✓ ${file} completed`);
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`  ⊘ ${file} skipped (already applied)`);
      } else {
        console.error(`  ✗ ${file} failed: ${error.message}`);
        throw error;
      }
    }
  }

  await dataSource.destroy();
  console.log('All migrations completed!');
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
