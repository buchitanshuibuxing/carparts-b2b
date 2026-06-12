import { DataSource } from 'typeorm';
import bcrypt from 'bcrypt';

export async function seedAdmin(dataSource: DataSource) {
  const userRepo = dataSource.getRepository('users');
  const existing = await userRepo.findOne({ where: { username: 'admin' } });
  if (!existing) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await userRepo.save({
      username: 'admin',
      email: 'admin@carparts.local',
      passwordHash,
      displayName: 'Administrator',
      role: 'admin',
    });
    console.log('Admin user seeded: admin / admin123');
  }

  // Seed default settings
  const settingsRepo = dataSource.getRepository('settings');
  const defaults = [
    { key: 'company_name', value: '' },
    { key: 'default_currency', value: 'USD' },
    { key: 'low_stock_alert', value: 'true' },
    { key: 'ocr_enabled', value: 'true' },
    { key: 'ocr_api_type', value: 'tesseract' },
    { key: 'ai_recognition_enabled', value: 'true' },
    { key: 'ai_recognition_api_type', value: 'zhipu' },
    { key: 'ai_recognition_api_key', value: '' },
    { key: 'ai_recognition_api_url', value: '' },
    { key: 'ai_recognition_model', value: 'glm-4v-flash' },
    { key: 'oe_lookup_enabled', value: 'true' },
    { key: 'oe_lookup_api_type', value: 'zhipu' },
    { key: 'oe_lookup_api_key', value: '' },
    { key: 'oe_lookup_api_url', value: '' },
    { key: 'oe_lookup_model', value: 'glm-4-flash' },
  ];
  for (const s of defaults) {
    const existing = await settingsRepo.findOne({ where: { key: s.key } });
    if (!existing) await settingsRepo.save(s);
  }

  // Seed default asset classifications
  const classRepo = dataSource.getRepository('asset_classifications');
  const existingClass = await classRepo.count();
  if (existingClass === 0) {
    await classRepo.save([
      { name: '产品图', description: '配件产品照片', sortOrder: 1 },
      { name: '包装图', description: '配件包装照片', sortOrder: 2 },
      { name: '图纸', description: '技术图纸和尺寸图', sortOrder: 3 },
      { name: '标签图', description: '配件标签和铭牌', sortOrder: 4 },
      { name: '宣传图', description: '营销和宣传素材', sortOrder: 5 },
    ]);
    console.log('Default asset classifications seeded');
  }
}
