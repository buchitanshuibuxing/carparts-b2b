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
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
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
      logging: false,
      extra: {
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
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
  ],
})
export class AppModule {}
