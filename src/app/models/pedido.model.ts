export interface Pedido {
  id?: number;
  fecha?: string;
  cliente: string;
  clienteEmail?: string;
  estado: string;
  total: number;
}
