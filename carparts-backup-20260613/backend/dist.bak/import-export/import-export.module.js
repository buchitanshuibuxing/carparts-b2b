"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportExportModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const import_export_service_1 = require("./import-export.service");
const import_export_controller_1 = require("./import-export.controller");
const part_entity_1 = require("../parts/entities/part.entity");
const part_classification_entity_1 = require("../parts/entities/part-classification.entity");
const inventory_entity_1 = require("../inventory/entities/inventory.entity");
const supplier_entity_1 = require("../suppliers/entities/supplier.entity");
const customer_entity_1 = require("../customers/entities/customer.entity");
const price_entity_1 = require("../prices/entities/price.entity");
const order_entity_1 = require("../orders/entities/order.entity");
const order_item_entity_1 = require("../orders/entities/order-item.entity");
const settings_module_1 = require("../settings/settings.module");
let ImportExportModule = class ImportExportModule {
};
exports.ImportExportModule = ImportExportModule;
exports.ImportExportModule = ImportExportModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([part_entity_1.Part, part_classification_entity_1.PartClassification, inventory_entity_1.Inventory, supplier_entity_1.Supplier, customer_entity_1.Customer, price_entity_1.Price, order_entity_1.Order, order_item_entity_1.OrderItem]), settings_module_1.SettingsModule],
        controllers: [import_export_controller_1.ImportExportController],
        providers: [import_export_service_1.ImportExportService],
        exports: [import_export_service_1.ImportExportService],
    })
], ImportExportModule);
//# sourceMappingURL=import-export.module.js.map