import { Repository, DataSource } from 'typeorm';
import { Quotation } from './entities/quotation.entity';
import { QuotationItem } from './entities/quotation-item.entity';
import { QuotationTemplate } from './entities/quotation-template.entity';
import { PaymentAccount } from './entities/payment-account.entity';
import { Part } from '../parts/entities/part.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { InventoryLog } from '../inventory/entities/inventory-log.entity';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
export declare class QuotationsService {
    private quotationRepo;
    private itemRepo;
    private templateRepo;
    private paymentAccountRepo;
    private partRepo;
    private customerRepo;
    private orderRepo;
    private orderItemRepo;
    private invRepo;
    private logRepo;
    private dataSource;
    constructor(quotationRepo: Repository<Quotation>, itemRepo: Repository<QuotationItem>, templateRepo: Repository<QuotationTemplate>, paymentAccountRepo: Repository<PaymentAccount>, partRepo: Repository<Part>, customerRepo: Repository<Customer>, orderRepo: Repository<Order>, orderItemRepo: Repository<OrderItem>, invRepo: Repository<Inventory>, logRepo: Repository<InventoryLog>, dataSource: DataSource);
    getTemplates(): Promise<QuotationTemplate[]>;
    getTemplate(id: number): Promise<QuotationTemplate | null>;
    saveTemplate(data: any): Promise<QuotationTemplate>;
    updateTemplate(id: number, data: any): Promise<QuotationTemplate>;
    deleteTemplate(id: number): Promise<void>;
    generate(data: any): Promise<{
        quotation: Quotation;
        items: {
            part: Part | null;
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
        paymentAccount: PaymentAccount | null;
    }>;
    findAll(page?: number, pageSize?: number, filters?: {
        status?: string;
        customer_id?: number;
        keyword?: string;
        date_from?: string;
        date_to?: string;
    }): Promise<PaginatedResponseDto<Quotation>>;
    findOne(id: number): Promise<{
        quotation: Quotation;
        items: {
            part: Part | null;
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
        paymentAccount: PaymentAccount | null;
    }>;
    update(id: number, data: any): Promise<{
        quotation: Quotation;
        items: {
            part: Part | null;
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
        paymentAccount: PaymentAccount | null;
    }>;
    delete(id: number): Promise<{
        deleted: boolean;
    }>;
    updateStatus(id: number, status: string): Promise<Quotation>;
    convertToOrder(quotationId: number, userId?: number): Promise<{
        order: Order;
    }>;
    getPaymentAccounts(): Promise<PaymentAccount[]>;
    getPaymentAccount(id: number): Promise<PaymentAccount | null>;
    createPaymentAccount(data: any): Promise<PaymentAccount>;
    updatePaymentAccount(id: number, data: any): Promise<PaymentAccount>;
    deletePaymentAccount(id: number): Promise<{
        deleted: boolean;
    }>;
    private findOrCreateCustomer;
}
