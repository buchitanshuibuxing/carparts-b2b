export interface Quotation {
  id: number;
  quotationNumber: string;
  templateId?: number;
  customerId?: number;
  customerName?: string;
  sellerCompany: string;
  sellerContact: string;
  sellerPhone: string;
  sellerEmail: string;
  sellerAddress: string;
  logoUrl: string;
  buyerCompany: string;
  buyerContact: string;
  buyerPhone: string;
  buyerEmail: string;
  buyerAddress: string;
  tradeTerms: string;
  portLoading: string;
  portDest: string;
  deliveryTime: string;
  validUntil?: string;
  totalAmount: number;
  discountPct: number;
  shippingCost: number;
  currency: string;
  status: string;
  paymentStages: PaymentStage[];
  paymentAccountId?: number;
  notes: string;
  remark: string;
  pdfPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationItem {
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
  part?: { oeNumber: string; partNameCn: string; brand: string } | null;
}

export interface PaymentStage {
  method: string;
  percent: number;
  description: string;
}

export interface PaymentAccount {
  id: number;
  accountName: string;
  beneficiaryName: string;
  bankName: string;
  bankAddress: string;
  swiftCode: string;
  accountNumber: string;
  accountType: string;
  bankCode: string;
  branchCode: string;
  currency: string;
  remark: string;
  isDefault: boolean;
  createdAt: string;
}
