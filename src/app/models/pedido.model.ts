export interface PedidoItem {
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Pedido {
  id?: number;
  fecha?: string;
  cliente: string;
  clienteEmail?: string;
  estado: string;
  total: number;
  items?: PedidoItem[];
}

