import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PartsModule } from './parts/parts.module';
import { InventoryModule } from './inventory/inventory.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { CustomersModule } from './customers/customers.module';
import { PricesModule } from './prices/prices.module';
import { OrdersModule } from './orders/orders.module';
import { QuotationsModule } from './quotations/quotations.module';
import { AssetsModule } from './assets/assets.module';
import { FacebookModule } from './facebook/facebook.module';
import { ImportExportModule } from './import-export/import-export.module';
import { SettingsModule } from './settings/settings.module';
import { TodosModule } from './todos/todos.module';
import { SystemModule } from './system/system.module';
import { DatabaseModule } from './database/database.module';
import { CommonModule } from './common/common.module';
import { PermissionsGuard } from './common/guards/permissions.guard';

@Module({
  imports: [
    CommonModule,
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'carparts',
      password: process.env.DB_PASSWORD || 'carparts123',
      database: process.env.DB_NAME || 'carparts',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false,
      logging: process.env.NODE_ENV !== 'production',
      // 连接池配置
      extra: {
        max: 20,           // 最大连接数
        min: 5,            // 最小连接数
        acquireTimeoutMillis: 30000,  // 获取连接超时
        idleTimeoutMillis: 60000,     // 空闲连接超时
        connectionLimit: 20,          // 连接限制
      },
    }),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    PartsModule,
    InventoryModule,
    SuppliersModule,
    CustomersModule,
    PricesModule,
    OrdersModule,
    QuotationsModule,
    AssetsModule,
    FacebookModule,
    ImportExportModule,
    SettingsModule,
    TodosModule,
    SystemModule,
  ],
})
export class AppModule {}
