"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const schedule_1 = require("@nestjs/schedule");
const serve_static_1 = require("@nestjs/serve-static");
const path_1 = require("path");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const parts_module_1 = require("./parts/parts.module");
const inventory_module_1 = require("./inventory/inventory.module");
const suppliers_module_1 = require("./suppliers/suppliers.module");
const customers_module_1 = require("./customers/customers.module");
const prices_module_1 = require("./prices/prices.module");
const orders_module_1 = require("./orders/orders.module");
const quotations_module_1 = require("./quotations/quotations.module");
const assets_module_1 = require("./assets/assets.module");
const facebook_module_1 = require("./facebook/facebook.module");
const import_export_module_1 = require("./import-export/import-export.module");
const settings_module_1 = require("./settings/settings.module");
const database_module_1 = require("./database/database.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            typeorm_1.TypeOrmModule.forRoot({
                type: 'postgres',
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT || '5432'),
                username: process.env.DB_USER || 'carparts',
                password: process.env.DB_PASSWORD || 'carparts123',
                database: process.env.DB_NAME || 'carparts',
                entities: [__dirname + '/**/*.entity{.ts,.js}'],
                synchronize: false,
                logging: process.env.NODE_ENV !== 'production',
            }),
            schedule_1.ScheduleModule.forRoot(),
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(__dirname, '..', 'uploads'),
                serveRoot: '/uploads',
            }),
            database_module_1.DatabaseModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            parts_module_1.PartsModule,
            inventory_module_1.InventoryModule,
            suppliers_module_1.SuppliersModule,
            customers_module_1.CustomersModule,
            prices_module_1.PricesModule,
            orders_module_1.OrdersModule,
            quotations_module_1.QuotationsModule,
            assets_module_1.AssetsModule,
            facebook_module_1.FacebookModule,
            import_export_module_1.ImportExportModule,
            settings_module_1.SettingsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map