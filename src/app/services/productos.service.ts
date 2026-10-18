import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Producto } from '../models/producto.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductosService {
  private readonly apiUrl = environment.productosApiUrl;

  readonly cachedProductos = signal<Producto[]>([]);
  readonly hasLoaded = signal<boolean>(false);

  constructor(private http: HttpClient) {}

  getProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(this.apiUrl).pipe(
      tap((data) => {
        this.cachedProductos.set(data);
        this.hasLoaded.set(true);
      })
    );
  }

  getProducto(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.apiUrl}/${id}`);
  }

  createProducto(producto: Producto): Observable<Producto> {
    return this.http.post<Producto>(this.apiUrl, producto).pipe(
      tap((created) => {
        const current = this.cachedProductos();
        this.cachedProductos.set([...current, created]);
      })
    );
  }

  deleteProducto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        const filtered = this.cachedProductos().filter(p => p.id !== id);
        this.cachedProductos.set(filtered);
      })
    );
  }
}
