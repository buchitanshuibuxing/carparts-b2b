import { OrdersService } from './orders.service';
export declare class OrdersController {
    private svc;
    constructor(svc: OrdersService);
    findAll(p?: number, ps?: number, s?: string, cid?: number, kw?: string): Promise<import("../common/dto/paginated-response.dto").PaginatedResponseDto<{
        customer: import("../customers/entities/customer.entity").Customer | null;
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
    getStats(df?: string, dt?: string): Promise<{
        total_orders: number;
        pending_orders: number;
        confirmed_orders: number;
        shipped_orders: number;
        completed_orders: number;
        cancelled_orders: number;
        current_month_total: number;
        current_month_revenue: number;
    }>;
    getDefaultPrice(partId: number): Promise<{
        price: number;
    }>;
    findOne(id: number): Promise<{
        order: {
            customer: import("../customers/entities/customer.entity").Customer | null;
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
            part: import("../parts/entities/part.entity").Part | null;
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
    create(body: any, uid: number): Promise<{
        order: import("./entities/order.entity").Order;
        items: import("./entities/order-item.entity").OrderItem[];
    }>;
    updateOrder(id: number, body: any): Promise<import("./entities/order.entity").Order>;
    updateStatus(id: number, body: {
        status: string;
    }): Promise<import("./entities/order.entity").Order>;
    cancel(id: number, body: {
        reason: string;
    }, uid: number): Promise<import("./entities/order.entity").Order>;
    addItem(id: number, body: any): Promise<{
        orderId: number;
        partId: number;
        quantity: number;
        unitPrice: number;
        discountPct: number;
        subtotal: number;
    } & import("./entities/order-item.entity").OrderItem>;
    updateItem(itemId: number, body: any): Promise<import("./entities/order-item.entity").OrderItem>;
    removeItem(itemId: number): Promise<{
        deleted: boolean;
    }>;
    deleteOrder(id: number): Promise<{
        deleted: boolean;
    }>;
    batchUpdateStatus(body: {
        ids: number[];
        status: string;
    }): Promise<{
        updated: number;
    }>;
    batchDelete(body: {
        ids: number[];
    }): Promise<{
        deleted: number;
    }>;
}
