import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Pedido } from '../models/pedido.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PedidosService {
  private readonly apiUrl = environment.pedidosApiUrl;

  readonly cachedPedidos = signal<Pedido[]>([]);
  readonly hasLoaded = signal<boolean>(false);

  constructor(private http: HttpClient) {}

  getPedidos(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(this.apiUrl).pipe(
      tap((data) => {
        this.cachedPedidos.set(data);
        this.hasLoaded.set(true);
      })
    );
  }

  getPedido(id: number): Observable<Pedido> {
    return this.http.get<Pedido>(`${this.apiUrl}/${id}`);
  }

  createPedido(pedido: Pedido): Observable<Pedido> {
    return this.http.post<Pedido>(this.apiUrl, pedido).pipe(
      tap((created) => {
        const current = this.cachedPedidos();
        this.cachedPedidos.set([created, ...current]);
      })
    );
  }

  deletePedido(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        const filtered = this.cachedPedidos().filter(p => p.id !== id);
        this.cachedPedidos.set(filtered);
      })
    );
  }
}
