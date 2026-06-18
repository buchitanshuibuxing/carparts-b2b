"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const dataSource = new typeorm_1.DataSource({
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
    const migrationsDir = path_1.default.join(__dirname, 'migrations');
    const files = fs_1.default.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    for (const file of files) {
        console.log(`Running migration: ${file}`);
        const sql = fs_1.default.readFileSync(path_1.default.join(migrationsDir, file), 'utf-8');
        try {
            await dataSource.query(sql);
            console.log(`  ✓ ${file} completed`);
        }
        catch (error) {
            if (error.message.includes('already exists')) {
                console.log(`  ⊘ ${file} skipped (already applied)`);
            }
            else {
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
//# sourceMappingURL=run-migrations.js.map