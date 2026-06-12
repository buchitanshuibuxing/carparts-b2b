export interface Supplier {
  id: number;
  supplierCode: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  country: string;
  paymentTerms: string;
  currency: string;
  leadTimeDays: number;
  rating: number;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
