"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuotationsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const quotations_service_1 = require("./quotations.service");
const quotations_controller_1 = require("./quotations.controller");
const quotation_entity_1 = require("./entities/quotation.entity");
const quotation_item_entity_1 = require("./entities/quotation-item.entity");
const quotation_template_entity_1 = require("./entities/quotation-template.entity");
const payment_account_entity_1 = require("./entities/payment-account.entity");
const part_entity_1 = require("../parts/entities/part.entity");
const part_classification_entity_1 = require("../parts/entities/part-classification.entity");
const customer_entity_1 = require("../customers/entities/customer.entity");
const order_entity_1 = require("../orders/entities/order.entity");
const order_item_entity_1 = require("../orders/entities/order-item.entity");
const inventory_entity_1 = require("../inventory/entities/inventory.entity");
const inventory_log_entity_1 = require("../inventory/entities/inventory-log.entity");
let QuotationsModule = class QuotationsModule {
};
exports.QuotationsModule = QuotationsModule;
exports.QuotationsModule = QuotationsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([
                quotation_entity_1.Quotation, quotation_item_entity_1.QuotationItem, quotation_template_entity_1.QuotationTemplate, payment_account_entity_1.PaymentAccount,
                part_entity_1.Part, part_classification_entity_1.PartClassification, customer_entity_1.Customer,
                order_entity_1.Order, order_item_entity_1.OrderItem, inventory_entity_1.Inventory, inventory_log_entity_1.InventoryLog,
            ])],
        controllers: [quotations_controller_1.QuotationsController],
        providers: [quotations_service_1.QuotationsService],
        exports: [quotations_service_1.QuotationsService],
    })
], QuotationsModule);
//# sourceMappingURL=quotations.module.js.map