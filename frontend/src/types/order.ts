export interface Order {
  id: number;
  orderNumber: string;
  customerId: number;
  orderDate: string;
  status: string;
  totalAmount: number;
  currency: string;
  shippingMethod: string;
  shippingAddress: string;
  trackingNumber: string;
  estimatedDate?: string;
  actualDate?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  partId: number;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  subtotal: number;
  fulfillmentQty: number;
  notes: string;
}

export interface OrderStats {
  total_orders: number;
  pending_orders: number;
  confirmed_orders: number;
  shipped_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  current_month_total: number;
  current_month_revenue: number;
}
