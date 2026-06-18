export declare class Order {
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
}
