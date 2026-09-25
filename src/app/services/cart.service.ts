import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CartItem, CartSummary } from '../models/cart.model';
import { Observable, tap, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly apiUrl = 'http://localhost:8083/api/v1/carrito';

  // Signals reactivos para el estado del carrito
  readonly cart = signal<CartSummary>({ items: [], totalItems: 0, totalAmount: 0 });
  readonly isDrawerOpen = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);

  // Computeds útiles para el UI
  readonly totalItems = computed(() => this.cart().totalItems);
  readonly totalAmount = computed(() => this.cart().totalAmount);
  readonly items = computed(() => this.cart().items);

  constructor(private http: HttpClient) {
    this.cargarCarrito();
  }

  openDrawer(): void {
    this.isDrawerOpen.set(true);
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
  }

  toggleDrawer(): void {
    this.isDrawerOpen.update(v => !v);
  }

  cargarCarrito(): void {
    this.isLoading.set(true);
    this.http.get<CartSummary>(this.apiUrl).pipe(
      catchError(() => {
        // Fallback local en caso de que carrito-service esté levantando
        const local = localStorage.getItem('pedidos360_cart_fallback');
        if (local) {
          try {
            return of(JSON.parse(local) as CartSummary);
          } catch {
            // ignore
          }
        }
        return of({ items: [], totalItems: 0, totalAmount: 0 });
      })
    ).subscribe(data => {
      this.cart.set(data);
      this.isLoading.set(false);
    });
  }

  agregarItem(productCode: string, productName: string, unitPrice: number, quantity: number = 1): Observable<any> {
    const payload = { productCode, productName, unitPrice, quantity };

    return this.http.post<CartItem>(`${this.apiUrl}/items`, payload).pipe(
      tap(() => {
        this.cargarCarrito();
        this.openDrawer();
      }),
      catchError(err => {
        // Fallback reactivo local
        this.cart.update(curr => {
          const existing = curr.items.find(i => i.productCode === productCode);
          let updatedItems: CartItem[];
          if (existing) {
            updatedItems = curr.items.map(i => i.productCode === productCode
              ? { ...i, quantity: i.quantity + quantity, subtotal: (i.quantity + quantity) * unitPrice }
              : i
            );
          } else {
            updatedItems = [...curr.items, {
              id: Date.now(),
              productCode,
              productName,
              unitPrice,
              quantity,
              subtotal: unitPrice * quantity
            }];
          }
          const totalItems = updatedItems.reduce((acc, i) => acc + i.quantity, 0);
          const totalAmount = updatedItems.reduce((acc, i) => acc + (i.subtotal || 0), 0);
          const nextState = { items: updatedItems, totalItems, totalAmount };
          localStorage.setItem('pedidos360_cart_fallback', JSON.stringify(nextState));
          return nextState;
        });
        this.openDrawer();
        return of(null);
      })
    );
  }

  actualizarCantidad(id: number, quantity: number): void {
    if (quantity <= 0) {
      this.eliminarItem(id);
      return;
    }

    this.http.put(`${this.apiUrl}/items/${id}`, { quantity }).pipe(
      tap(() => this.cargarCarrito()),
      catchError(() => {
        this.cart.update(curr => {
          const updatedItems = curr.items.map(i => i.id === id
            ? { ...i, quantity, subtotal: i.unitPrice * quantity }
            : i
          );
          const totalItems = updatedItems.reduce((acc, i) => acc + i.quantity, 0);
          const totalAmount = updatedItems.reduce((acc, i) => acc + (i.subtotal || 0), 0);
          const nextState = { items: updatedItems, totalItems, totalAmount };
          localStorage.setItem('pedidos360_cart_fallback', JSON.stringify(nextState));
          return nextState;
        });
        return of(null);
      })
    ).subscribe();
  }

  eliminarItem(id: number): void {
    this.http.delete(`${this.apiUrl}/items/${id}`).pipe(
      tap(() => this.cargarCarrito()),
      catchError(() => {
        this.cart.update(curr => {
          const updatedItems = curr.items.filter(i => i.id !== id);
          const totalItems = updatedItems.reduce((acc, i) => acc + i.quantity, 0);
          const totalAmount = updatedItems.reduce((acc, i) => acc + (i.subtotal || 0), 0);
          const nextState = { items: updatedItems, totalItems, totalAmount };
          localStorage.setItem('pedidos360_cart_fallback', JSON.stringify(nextState));
          return nextState;
        });
        return of(null);
      })
    ).subscribe();
  }

  vaciarCarrito(): void {
    this.http.delete(this.apiUrl).pipe(
      tap(() => this.cargarCarrito()),
      catchError(() => {
        const empty = { items: [], totalItems: 0, totalAmount: 0 };
        this.cart.set(empty);
        localStorage.removeItem('pedidos360_cart_fallback');
        return of(null);
      })
    ).subscribe();
  }
}
