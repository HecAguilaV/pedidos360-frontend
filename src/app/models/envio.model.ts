export interface Envio {
  id?: number;
  orderId: number;
  numeroGuia: string;
  destinatario: string;
  destinatarioEmail?: string;
  direccionEntrega?: string;
  estado: string; // 'PREPARANDO_PAQUETE' | 'EN_TRANSITO' | 'ENTREGADO'
  empresaTransporte: string;
  fechaDespacho: string;
  fechaEstimadaEntrega: string;
}
