import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { CartService } from './services/cart.service';
import { PedidosService } from './services/pedidos.service';
import { EnviosService } from './services/envios.service';
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
  checkoutError = signal<string | null>(null);
  lastOrderResult = signal<{ orderId: number; total: number; trackingNumber: string; email: string } | null>(null);

  constructor(
    public authService: AuthService,
    public cartService: CartService,
    private pedidosService: PedidosService,
    private enviosService: EnviosService,
    private router: Router
  ) {}

  realizarCheckout(): void {
    const items = this.cartService.items();
    if (items.length === 0) return;

    // Si el usuario es un invitado, redirigir a inicio de sesión
    if (!this.authService.isAuthenticated()) {
      this.cartService.closeDrawer();
      this.router.navigate(['/login'], { queryParams: { returnUrl: 'checkout' } });
      return;
    }

    this.checkoutLoading.set(true);
    this.checkoutError.set(null);

    const currentUser = this.authService.currentUser();
    const clienteNombre = currentUser ? currentUser.name : 'Cliente Pedidos360';
    const clienteEmail = (currentUser && currentUser.username) ? currentUser.username : 'cliente@pedidos360.cl';
    const total = this.cartService.totalAmount();

    const nuevoPedido: Pedido = {
      cliente: clienteNombre,
      clienteEmail: clienteEmail,
      estado: 'PAGADA',
      total: total,
      items: items.map(item => ({
        productCode: item.productCode,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }))
    };

    this.pedidosService.createPedido(nuevoPedido).subscribe({
      next: (pedidoCreado) => {
        const orderId = pedidoCreado.id!;
        this.enviosService.obtenerPorOrden(orderId).subscribe((envio) => {
          const trackingNumber = envio?.numeroGuia || `TRACK-2026-${String(orderId).padStart(5, '0')}`;

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
        });
      },
      error: (err) => {
        console.error('Error al procesar el checkout en pedidos-service:', err);
        this.checkoutLoading.set(false);
        this.checkoutError.set('No se pudo registrar la orden. Verifica que el servicio de pedidos esté disponible e intenta nuevamente.');
      }
    });
  }

  cerrarModalExito(): void {
    this.checkoutSuccessModal.set(false);
  }

  irATracking(guia: string): void {
    this.checkoutSuccessModal.set(false);
    this.router.navigate(['/tracking'], {
      queryParams: guia ? { guia } : {}
    });
  }
}

