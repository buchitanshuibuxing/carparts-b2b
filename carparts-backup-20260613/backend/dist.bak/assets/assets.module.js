"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const assets_service_1 = require("./assets.service");
const assets_controller_1 = require("./assets.controller");
const image_processing_service_1 = require("./image-processing.service");
const image_recognition_service_1 = require("./image-recognition.service");
const ocr_service_1 = require("./ocr.service");
const import_sources_service_1 = require("./import-sources.service");
const image_asset_entity_1 = require("./entities/image-asset.entity");
const asset_tag_entity_1 = require("./entities/asset-tag.entity");
const asset_classification_entity_1 = require("./entities/asset-classification.entity");
const import_source_entity_1 = require("./entities/import-source.entity");
const part_entity_1 = require("../parts/entities/part.entity");
const part_classification_entity_1 = require("../parts/entities/part-classification.entity");
const settings_module_1 = require("../settings/settings.module");
let AssetsModule = class AssetsModule {
};
exports.AssetsModule = AssetsModule;
exports.AssetsModule = AssetsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([image_asset_entity_1.ImageAsset, asset_tag_entity_1.AssetTag, asset_classification_entity_1.AssetClassification, import_source_entity_1.ImportSource, part_entity_1.Part, part_classification_entity_1.PartClassification]), settings_module_1.SettingsModule],
        controllers: [assets_controller_1.AssetsController],
        providers: [assets_service_1.AssetsService, image_processing_service_1.ImageProcessingService, image_recognition_service_1.ImageRecognitionService, ocr_service_1.OcrService, import_sources_service_1.ImportSourcesService],
        exports: [assets_service_1.AssetsService],
    })
], AssetsModule);
//# sourceMappingURL=assets.module.js.map