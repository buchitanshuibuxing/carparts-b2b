"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentAccount = void 0;
const typeorm_1 = require("typeorm");
let PaymentAccount = class PaymentAccount {
    id;
    accountName;
    beneficiaryName;
    bankName;
    bankAddress;
    swiftCode;
    accountNumber;
    currency;
    remark;
    isDefault;
    createdAt;
};
exports.PaymentAccount = PaymentAccount;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], PaymentAccount.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'account_name' }),
    __metadata("design:type", String)
], PaymentAccount.prototype, "accountName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'beneficiary_name', default: '' }),
    __metadata("design:type", String)
], PaymentAccount.prototype, "beneficiaryName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'bank_name', default: '' }),
    __metadata("design:type", String)
], PaymentAccount.prototype, "bankName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'bank_address', default: '' }),
    __metadata("design:type", String)
], PaymentAccount.prototype, "bankAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'swift_code', default: '' }),
    __metadata("design:type", String)
], PaymentAccount.prototype, "swiftCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'account_number', default: '' }),
    __metadata("design:type", String)
], PaymentAccount.prototype, "accountNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'USD' }),
    __metadata("design:type", String)
], PaymentAccount.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], PaymentAccount.prototype, "remark", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_default', default: false }),
    __metadata("design:type", Boolean)
], PaymentAccount.prototype, "isDefault", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], PaymentAccount.prototype, "createdAt", void 0);
exports.PaymentAccount = PaymentAccount = __decorate([
    (0, typeorm_1.Entity)('payment_accounts')
], PaymentAccount);
//# sourceMappingURL=payment-account.entity.js.map