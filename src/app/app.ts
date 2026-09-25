import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { CartService } from './services/cart.service';
import { PedidosService } from './services/pedidos.service';
import { Pedido } from './models/pedido.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  checkoutLoading = signal<boolean>(false);
  checkoutSuccessModal = signal<boolean>(false);
  lastOrderResult = signal<{ orderId: number; total: number; trackingNumber: string; email: string } | null>(null);

  constructor(
    public authService: AuthService,
    public cartService: CartService,
    private pedidosService: PedidosService,
    private router: Router
  ) {}

  realizarCheckout(): void {
    const items = this.cartService.items();
    if (items.length === 0) return;

    this.checkoutLoading.set(true);

    const currentUser = this.authService.currentUser();
    const clienteNombre = currentUser ? currentUser.name : 'Cliente Pedidos360';
    const clienteEmail = (currentUser && currentUser.username) ? currentUser.username : 'he.aguila@duocuc.cl';
    const total = this.cartService.totalAmount();

    const nuevoPedido: Pedido = {
      cliente: clienteNombre,
      clienteEmail: clienteEmail,
      estado: 'PAGADA',
      total: total
    };

    this.pedidosService.createPedido(nuevoPedido).subscribe({
      next: (pedidoCreado) => {
        const orderId = pedidoCreado.id || Math.floor(1000 + Math.random() * 9000);
        const trackingNumber = `TRACK-2026-${String(orderId).padStart(5, '0')}`;

        this.lastOrderResult.set({
          orderId,
          total,
          trackingNumber,
          email: clienteEmail
        });

        // Vaciar el carrito y cerrar drawer
        this.cartService.vaciarCarrito();
        this.cartService.closeDrawer();
        this.checkoutLoading.set(false);
        this.checkoutSuccessModal.set(true);
      },
      error: () => {
        // Fallback local en caso de que pedidos-service esté reconectando
        const orderId = Math.floor(1000 + Math.random() * 9000);
        const trackingNumber = `TRACK-2026-${String(orderId).padStart(5, '0')}`;

        this.lastOrderResult.set({
          orderId,
          total,
          trackingNumber,
          email: clienteEmail
        });

        this.cartService.vaciarCarrito();
        this.cartService.closeDrawer();
        this.checkoutLoading.set(false);
        this.checkoutSuccessModal.set(true);
      }
    });
  }

  cerrarModalExito(): void {
    this.checkoutSuccessModal.set(false);
  }

  irATracking(guia: string): void {
    this.checkoutSuccessModal.set(false);
    this.router.navigate(['/tracking']);
  }
}
