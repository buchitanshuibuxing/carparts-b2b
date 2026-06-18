import { Repository, DataSource } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Part } from '../parts/entities/part.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { InventoryLog } from '../inventory/entities/inventory-log.entity';
import { Price } from '../prices/entities/price.entity';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
export declare class OrdersService {
    private orderRepo;
    private itemRepo;
    private partRepo;
    private customerRepo;
    private invRepo;
    private logRepo;
    private priceRepo;
    private dataSource;
    constructor(orderRepo: Repository<Order>, itemRepo: Repository<OrderItem>, partRepo: Repository<Part>, customerRepo: Repository<Customer>, invRepo: Repository<Inventory>, logRepo: Repository<InventoryLog>, priceRepo: Repository<Price>, dataSource: DataSource);
    findAll(page?: number, pageSize?: number, filters?: {
        status?: string;
        customer_id?: number;
        date_from?: string;
        date_to?: string;
        keyword?: string;
    }): Promise<PaginatedResponseDto<{
        customer: Customer | null;
        id: number;
        orderNumber: string;
        customerId: number;
        orderDate: Date;
        status: string;
        totalAmount: number;
        currency: string;
        shippingMethod: string;
        shippingAddress: string;
        trackingNumber: string;
        estimatedDate: Date;
        actualDate: Date;
        notes: string;
        createdBy: number;
        createdAt: Date;
        updatedAt: Date;
    }>>;
    findOne(id: number): Promise<{
        order: {
            customer: Customer | null;
            id: number;
            orderNumber: string;
            customerId: number;
            orderDate: Date;
            status: string;
            totalAmount: number;
            currency: string;
            shippingMethod: string;
            shippingAddress: string;
            trackingNumber: string;
            estimatedDate: Date;
            actualDate: Date;
            notes: string;
            createdBy: number;
            createdAt: Date;
            updatedAt: Date;
        };
        items: {
            part: Part | null;
            id: number;
            orderId: number;
            partId: number;
            quantity: number;
            unitPrice: number;
            discountPct: number;
            subtotal: number;
            fulfillmentQty: number;
            notes: string;
        }[];
    }>;
    create(data: {
        customer_id: number;
        currency?: string;
        shipping_method?: string;
        shipping_address?: string;
        notes?: string;
        allow_negative?: boolean;
        items: {
            part_id: number;
            quantity: number;
            unit_price?: number;
            discount_pct?: number;
        }[];
    }, userId?: number): Promise<{
        order: Order;
        items: OrderItem[];
    }>;
    updateOrder(id: number, data: any): Promise<Order>;
    updateItem(itemId: number, data: {
        quantity?: number;
        unit_price?: number;
        discount_pct?: number;
    }): Promise<OrderItem>;
    addItem(orderId: number, data: {
        part_id: number;
        quantity: number;
        unit_price?: number;
        discount_pct?: number;
        allow_negative?: boolean;
    }): Promise<{
        orderId: number;
        partId: number;
        quantity: number;
        unitPrice: number;
        discountPct: number;
        subtotal: number;
    } & OrderItem>;
    removeItem(itemId: number): Promise<{
        deleted: boolean;
    }>;
    deleteOrder(id: number): Promise<{
        deleted: boolean;
    }>;
    batchUpdateStatus(ids: number[], status: string): Promise<{
        updated: number;
    }>;
    batchDelete(ids: number[]): Promise<{
        deleted: number;
    }>;
    updateStatus(id: number, status: string): Promise<Order>;
    cancel(id: number, reason: string, userId?: number): Promise<Order>;
    getStats(dateFrom?: string, dateTo?: string): Promise<{
        total_orders: number;
        pending_orders: number;
        confirmed_orders: number;
        shipped_orders: number;
        completed_orders: number;
        cancelled_orders: number;
        current_month_total: number;
        current_month_revenue: number;
    }>;
    getDefaultPrice(partId: number): Promise<number>;
    private recalcTotal;
}
