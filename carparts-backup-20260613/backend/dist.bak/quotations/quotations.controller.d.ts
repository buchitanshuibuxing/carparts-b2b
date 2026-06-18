import { QuotationsService } from './quotations.service';
export declare class QuotationsController {
    private svc;
    constructor(svc: QuotationsService);
    getTemplates(): Promise<import("./entities/quotation-template.entity").QuotationTemplate[]>;
    getTemplate(id: number): Promise<import("./entities/quotation-template.entity").QuotationTemplate | null>;
    saveTemplate(body: any): Promise<import("./entities/quotation-template.entity").QuotationTemplate>;
    updateTemplate(id: number, body: any): Promise<import("./entities/quotation-template.entity").QuotationTemplate>;
    deleteTemplate(id: number): Promise<void>;
    getPaymentAccounts(): Promise<import("./entities/payment-account.entity").PaymentAccount[]>;
    getPaymentAccount(id: number): Promise<import("./entities/payment-account.entity").PaymentAccount | null>;
    createPaymentAccount(body: any): Promise<import("./entities/payment-account.entity").PaymentAccount>;
    updatePaymentAccount(id: number, body: any): Promise<import("./entities/payment-account.entity").PaymentAccount>;
    deletePaymentAccount(id: number): Promise<{
        deleted: boolean;
    }>;
    findAll(page?: string, limit?: string, status?: string, customerId?: string, keyword?: string): Promise<import("../common/dto/paginated-response.dto").PaginatedResponseDto<import("./entities/quotation.entity").Quotation>>;
    findOne(id: number): Promise<{
        quotation: import("./entities/quotation.entity").Quotation;
        items: {
            part: import("../parts/entities/part.entity").Part | null;
            id: number;
            quotationId: number;
            partId: number;
            oeNumber: string;
            partName: string;
            brand: string;
            packageName: string;
            unit: string;
            quantity: number;
            unitPrice: number;
            subtotal: number;
        }[];
        paymentAccount: import("./entities/payment-account.entity").PaymentAccount | null;
    }>;
    generate(body: any): Promise<{
        quotation: import("./entities/quotation.entity").Quotation;
        items: {
            part: import("../parts/entities/part.entity").Part | null;
            id: number;
            quotationId: number;
            partId: number;
            oeNumber: string;
            partName: string;
            brand: string;
            packageName: string;
            unit: string;
            quantity: number;
            unitPrice: number;
            subtotal: number;
        }[];
        paymentAccount: import("./entities/payment-account.entity").PaymentAccount | null;
    }>;
    update(id: number, body: any): Promise<{
        quotation: import("./entities/quotation.entity").Quotation;
        items: {
            part: import("../parts/entities/part.entity").Part | null;
            id: number;
            quotationId: number;
            partId: number;
            oeNumber: string;
            partName: string;
            brand: string;
            packageName: string;
            unit: string;
            quantity: number;
            unitPrice: number;
            subtotal: number;
        }[];
        paymentAccount: import("./entities/payment-account.entity").PaymentAccount | null;
    }>;
    delete(id: number): Promise<{
        deleted: boolean;
    }>;
    updateStatus(id: number, body: {
        status: string;
    }): Promise<import("./entities/quotation.entity").Quotation>;
    convertToOrder(id: number, uid: number): Promise<{
        order: import("../orders/entities/order.entity").Order;
    }>;
}
