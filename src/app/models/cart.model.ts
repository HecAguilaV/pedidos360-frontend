export interface CartItem {
  id?: number;
  userId?: string;
  productCode: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartSummary {
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
}
