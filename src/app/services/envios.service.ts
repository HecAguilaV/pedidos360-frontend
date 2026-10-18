import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, retry, timer } from 'rxjs';
import { Envio } from '../models/envio.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EnviosService {
  private readonly apiUrl = environment.enviosApiUrl;


  constructor(private http: HttpClient) {}

  listarEnvios(): Observable<Envio[]> {
    return this.http.get<Envio[]>(this.apiUrl);
  }

  obtenerPorTracking(numeroGuia: string): Observable<Envio | null> {
    return this.http.get<Envio>(`${this.apiUrl}/tracking/${encodeURIComponent(numeroGuia)}`).pipe(
      catchError(() => of(null))
    );
  }

  obtenerPorOrden(orderId: number): Observable<Envio | null> {
    return this.http.get<Envio>(`${this.apiUrl}/orden/${orderId}`).pipe(
      retry({
        count: 4,
        delay: () => timer(350)
      }),
      catchError(() => of(null))
    );
  }

  actualizarEstado(id: number, estado: string): Observable<Envio> {
    return this.http.put<Envio>(`${this.apiUrl}/${id}/estado`, { estado });
  }
}

