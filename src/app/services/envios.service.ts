import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { Envio } from '../models/envio.model';

@Injectable({
  providedIn: 'root'
})
export class EnviosService {
  private readonly apiUrl = 'http://localhost:8085/api/v1/envios';

  constructor(private http: HttpClient) {}

  listarEnvios(): Observable<Envio[]> {
    return this.http.get<Envio[]>(this.apiUrl).pipe(
      catchError(() => of([
        {
          id: 1,
          orderId: 101,
          numeroGuia: 'TRACK-2026-00101-789',
          destinatario: 'Héctor Águila',
          destinatarioEmail: 'he.aguila@duocuc.cl',
          direccionEntrega: 'Av. Providencia 1234, Santiago',
          estado: 'EN_TRANSITO',
          empresaTransporte: 'Pedidos360 Express',
          fechaDespacho: new Date().toISOString(),
          fechaEstimadaEntrega: new Date(Date.now() + 86400000 * 2).toISOString()
        }
      ]))
    );
  }

  obtenerPorTracking(numeroGuia: string): Observable<Envio | null> {
    return this.http.get<Envio>(`${this.apiUrl}/tracking/${numeroGuia}`).pipe(
      catchError(() => of(null))
    );
  }

  obtenerPorOrden(orderId: number): Observable<Envio | null> {
    return this.http.get<Envio>(`${this.apiUrl}/orden/${orderId}`).pipe(
      catchError(() => of(null))
    );
  }
}
