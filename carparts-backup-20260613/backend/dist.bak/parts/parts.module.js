"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const parts_service_1 = require("./parts.service");
const parts_controller_1 = require("./parts.controller");
const part_classifications_service_1 = require("./part-classifications.service");
const part_classifications_controller_1 = require("./part-classifications.controller");
const part_entity_1 = require("./entities/part.entity");
const part_classification_entity_1 = require("./entities/part-classification.entity");
const inventory_entity_1 = require("../inventory/entities/inventory.entity");
const settings_module_1 = require("../settings/settings.module");
let PartsModule = class PartsModule {
};
exports.PartsModule = PartsModule;
exports.PartsModule = PartsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([part_entity_1.Part, part_classification_entity_1.PartClassification, inventory_entity_1.Inventory]), settings_module_1.SettingsModule],
        controllers: [part_classifications_controller_1.PartClassificationsController, parts_controller_1.PartsController],
        providers: [parts_service_1.PartsService, part_classifications_service_1.PartClassificationsService],
        exports: [parts_service_1.PartsService, part_classifications_service_1.PartClassificationsService],
    })
], PartsModule);
//# sourceMappingURL=parts.module.js.map