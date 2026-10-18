import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of, catchError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ProductosService } from '../../services/productos.service';
import { PedidosService } from '../../services/pedidos.service';
import { EnviosService } from '../../services/envios.service';
import { Producto } from '../../models/producto.model';
import { Pedido } from '../../models/pedido.model';
import { Envio } from '../../models/envio.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-shell">
      <div class="page-header">
        <div>
          <span class="page-eyebrow"><i class="ph ph-chart-bar"></i> Resumen Operativo</span>
          <h1 class="page-title">Hola, {{ authService.currentUser()?.name || 'Administrador' }}</h1>
          <p class="page-subtitle">Ventas, inventario y despachos del día en un solo lugar.</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-outline" (click)="cargar()" [disabled]="loading">
            <i class="ph" [ngClass]="loading ? 'ph-spinner ph-spin' : 'ph-arrows-clockwise'"></i>
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      <div class="alert-banner error" *ngIf="errores.length > 0">
        <span><i class="ph ph-warning-circle"></i> No se pudo cargar: {{ errores.join(', ') }}.</span>
      </div>

      <div class="kpi-strip">
        <div class="kpi-card">
          <div class="kpi-header"><span>Ventas Totales</span><i class="ph ph-currency-dollar"></i></div>
          <div class="kpi-value">\${{ totalVentas | number:'1.0-0' }}</div>
          <div class="kpi-meta">Neto \${{ netoVentas | number:'1.0-0' }} · IVA \${{ totalVentas - netoVentas | number:'1.0-0' }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header"><span>Órdenes</span><i class="ph ph-receipt"></i></div>
          <div class="kpi-value">{{ pedidos.length }}</div>
          <div class="kpi-meta">{{ pendientes }} pendientes de pago</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header"><span>Despachos Activos</span><i class="ph ph-truck"></i></div>
          <div class="kpi-value">{{ despachosActivos }}</div>
          <div class="kpi-meta">{{ envios.length }} guías en total</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header"><span>Stock Crítico</span><i class="ph ph-warning"></i></div>
          <div class="kpi-value">{{ stockCritico.length }}</div>
          <div class="kpi-meta">Productos bajo 10 unidades</div>
        </div>
      </div>

      <div class="home-grid">
        <div class="crm-card">
          <div class="crm-card-header">
            <div class="crm-card-title"><i class="ph ph-clock-counter-clockwise"></i> Últimas Órdenes</div>
            <a routerLink="/pedidos" class="btn btn-outline btn-sm">Ver todas</a>
          </div>
          <div class="crm-table-wrap" *ngIf="ultimasOrdenes.length > 0">
            <table class="crm-table">
              <thead>
                <tr><th>Orden</th><th>Cliente</th><th>Total (CLP)</th><th>Estado</th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let p of ultimasOrdenes">
                  <td><span class="mono-code">#{{ p.id }}</span></td>
                  <td>{{ p.cliente }}</td>
                  <td class="price-clp">\${{ p.total | number:'1.0-0' }}</td>
                  <td><span class="status-pill" [ngClass]="badgeOrden(p.estado)">{{ p.estado }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="empty-box" *ngIf="ultimasOrdenes.length === 0">
            <i class="ph ph-receipt"></i>
            <h4>Sin órdenes registradas</h4>
          </div>
        </div>

        <div class="crm-card">
          <div class="crm-card-header">
            <div class="crm-card-title"><i class="ph ph-warning"></i> Reposición Sugerida</div>
            <a routerLink="/productos" class="btn btn-outline btn-sm">Inventario</a>
          </div>
          <div class="crm-table-wrap" *ngIf="stockCritico.length > 0">
            <table class="crm-table">
              <thead>
                <tr><th>SKU</th><th>Producto</th><th>Stock</th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let prod of stockCritico">
                  <td><span class="mono-code">{{ prod.codigo }}</span></td>
                  <td>{{ prod.nombre }}</td>
                  <td>
                    <span class="status-pill" [ngClass]="prod.stock > 0 ? 'warning' : 'danger'">
                      {{ prod.stock > 0 ? prod.stock + ' unid.' : 'Agotado' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="empty-box" *ngIf="stockCritico.length === 0">
            <i class="ph ph-check-circle"></i>
            <h4>Inventario saludable</h4>
            <p>Ningún producto bajo el umbral de reposición.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home-grid {
      display: grid;
      grid-template-columns: 3fr 2fr;
      gap: 20px;
    }
    @media (max-width: 960px) {
      .home-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class HomeComponent implements OnInit {
  productos: Producto[] = [];
  pedidos: Pedido[] = [];
  envios: Envio[] = [];
  errores: string[] = [];
  loading = false;

  constructor(
    public authService: AuthService,
    private productosService: ProductosService,
    private pedidosService: PedidosService,
    private enviosService: EnviosService
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.errores = [];
    const fail = (label: string) => catchError(() => {
      this.errores.push(label);
      return of([]);
    });

    forkJoin({
      productos: this.productosService.getProductos().pipe(fail('inventario')),
      pedidos: this.pedidosService.getPedidos().pipe(fail('órdenes')),
      envios: this.enviosService.listarEnvios().pipe(fail('despachos'))
    }).subscribe(({ productos, pedidos, envios }) => {
      this.productos = productos as Producto[];
      this.pedidos = pedidos as Pedido[];
      this.envios = envios as Envio[];
      this.loading = false;
    });
  }

  get totalVentas(): number {
    return this.pedidos.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
  }

  get netoVentas(): number {
    return Math.round(this.totalVentas / 1.19);
  }

  get pendientes(): number {
    return this.pedidos.filter(p => p.estado === 'PENDIENTE').length;
  }

  get despachosActivos(): number {
    return this.envios.filter(e => e.estado !== 'ENTREGADO').length;
  }

  get stockCritico(): Producto[] {
    return this.productos.filter(p => p.stock < 10).sort((a, b) => a.stock - b.stock);
  }

  get ultimasOrdenes(): Pedido[] {
    return [...this.pedidos].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 6);
  }

  badgeOrden(estado: string): string {
    switch (estado) {
      case 'PAGADO':
      case 'ENTREGADO':
        return 'success';
      case 'PENDIENTE':
        return 'warning';
      case 'CONFIRMADO':
      case 'ENVIADO':
        return 'info';
      default:
        return 'neutral';
    }
  }
}
