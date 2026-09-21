import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ProductosService } from '../../services/productos.service';
import { PedidosService } from '../../services/pedidos.service';
import { Producto } from '../../models/producto.model';
import { Pedido } from '../../models/pedido.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard-container">
      <!-- Welcome Header -->
      <div class="dash-header">
        <div>
          <h2>Dashboard CRM</h2>
          <p class="dash-subtitle">Visión ejecutiva de operaciones, inventario y arquitectura de servicios</p>
        </div>
        <div class="dash-actions">
          <a routerLink="/pedidos" class="btn btn-primary">
            <i class="ph ph-plus-circle"></i> Nuevo Pedido
          </a>
        </div>
      </div>

      <!-- Metrics KPI Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon icon-blue">
            <i class="ph ph-shopping-cart-simple"></i>
          </div>
          <div class="kpi-content">
            <span class="kpi-label">Total Pedidos</span>
            <span class="kpi-value">{{ pedidos.length }}</span>
            <span class="kpi-sub positive"><i class="ph ph-trend-up"></i> Activos en sistema</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon icon-emerald">
            <i class="ph ph-currency-dollar"></i>
          </div>
          <div class="kpi-content">
            <span class="kpi-label">Volumen Facturado</span>
            <span class="kpi-value">\${{ totalFacturado | number:'1.2-2' }}</span>
            <span class="kpi-sub positive"><i class="ph ph-arrow-up-right"></i> PostgreSQL Cloud</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon icon-indigo">
            <i class="ph ph-package"></i>
          </div>
          <div class="kpi-content">
            <span class="kpi-label">Productos en Catálogo</span>
            <span class="kpi-value">{{ productos.length }}</span>
            <span class="kpi-sub neutral"><i class="ph ph-stack"></i> {{ totalStock }} unidades en stock</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon icon-amber">
            <i class="ph ph-shield-check"></i>
          </div>
          <div class="kpi-content">
            <span class="kpi-label">Sesión Activa</span>
            <span class="kpi-value badge-role">{{ authService.isAdmin() ? 'ADMIN' : 'OPERADOR' }}</span>
            <span class="kpi-sub neutral"><i class="ph ph-key"></i> {{ authService.currentUser()?.scopes?.length || 4 }} scopes asignados</span>
          </div>
        </div>
      </div>

      <!-- Quick Tables Row -->
      <div class="dash-two-cols">
        <!-- Recent Orders -->
        <div class="panel-card">
          <div class="panel-header">
            <div class="panel-title">
              <i class="ph ph-clock-counter-clockwise"></i>
              <h3>Últimos Pedidos</h3>
            </div>
            <a routerLink="/pedidos" class="panel-link">Ver todos →</a>
          </div>
          <div class="panel-body">
            <div *ngIf="pedidos.length === 0" class="empty-hint">
              <i class="ph ph-receipt"></i> No hay pedidos registrados aún.
            </div>
            <div class="recent-list" *ngIf="pedidos.length > 0">
              <div class="recent-item" *ngFor="let p of pedidos.slice(0, 4)">
                <div class="item-left">
                  <span class="item-badge">#{{ p.id }}</span>
                  <div>
                    <strong>{{ p.cliente }}</strong>
                    <small>{{ p.fecha | date:'dd MMM yyyy, HH:mm' }}</small>
                  </div>
                </div>
                <div class="item-right">
                  <span class="status-chip" [ngClass]="p.estado.toLowerCase()">
                    {{ p.estado }}
                  </span>
                  <span class="item-total">\${{ p.total | number:'1.2-2' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Inventory Preview -->
        <div class="panel-card">
          <div class="panel-header">
            <div class="panel-title">
              <i class="ph ph-warehouse"></i>
              <h3>Inventario de Productos</h3>
            </div>
            <a routerLink="/productos" class="panel-link">Gestionar →</a>
          </div>
          <div class="panel-body">
            <div *ngIf="productos.length === 0" class="empty-hint">
              <i class="ph ph-package"></i> No hay productos registrados aún.
            </div>
            <div class="recent-list" *ngIf="productos.length > 0">
              <div class="recent-item" *ngFor="let prod of productos.slice(0, 4)">
                <div class="item-left">
                  <div class="prod-icon"><i class="ph ph-cube"></i></div>
                  <div>
                    <strong>{{ prod.nombre }}</strong>
                    <small>{{ prod.descripcion }}</small>
                  </div>
                </div>
                <div class="item-right">
                  <span class="stock-pill" [class.low]="prod.stock < 15">{{ prod.stock }} un.</span>
                  <span class="item-total">\${{ prod.precio | number:'1.2-2' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Cloud Architecture Overview -->
      <div class="arch-card">
        <div class="arch-header">
          <i class="ph ph-git-network"></i>
          <div>
            <h3>Arquitectura Cloud Native en Operación</h3>
            <p>Trazabilidad del flujo de datos y autenticación según la especificación</p>
          </div>
        </div>
        <div class="arch-pipeline">
          <div class="pipe-node">
            <div class="node-icon"><i class="ph ph-browser"></i></div>
            <strong>Angular 22 SPA</strong>
            <small>MSAL + Interceptor</small>
          </div>
          <div class="pipe-arrow"><i class="ph ph-caret-right"></i></div>
          <div class="pipe-node">
            <div class="node-icon"><i class="ph ph-identification-card"></i></div>
            <strong>Entra ID (IDaaS)</strong>
            <small>OAuth2 / JWT PKCE</small>
          </div>
          <div class="pipe-arrow"><i class="ph ph-caret-right"></i></div>
          <div class="pipe-node">
            <div class="node-icon"><i class="ph ph-cloud"></i></div>
            <strong>AWS API Gateway</strong>
            <small>HTTP API Authorizer</small>
          </div>
          <div class="pipe-arrow"><i class="ph ph-caret-right"></i></div>
          <div class="pipe-node">
            <div class="node-icon"><i class="ph ph-cpu"></i></div>
            <strong>Docker en EC2</strong>
            <small>Spring Boot Microservices</small>
          </div>
          <div class="pipe-arrow"><i class="ph ph-caret-right"></i></div>
          <div class="pipe-node">
            <div class="node-icon"><i class="ph ph-database"></i></div>
            <strong>Amazon RDS</strong>
            <small>PostgreSQL Engine</small>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      display: flex;
      flex-direction: column;
      gap: 28px;
    }
    .dash-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .dash-header h2 {
      font-size: 1.6rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }
    .dash-subtitle {
      color: #64748b;
      font-size: 0.95rem;
    }
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      background: #2563eb;
      color: white;
      font-weight: 600;
      border-radius: 8px;
      text-decoration: none;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
      transition: all 0.2s;
    }
    .btn-primary:hover {
      background: #1d4ed8;
      transform: translateY(-1px);
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
    }
    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: flex-start;
      gap: 16px;
      box-shadow: var(--shadow-sm);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }
    .kpi-icon {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }
    .icon-blue { background: #eff6ff; color: #2563eb; }
    .icon-emerald { background: #ecfdf5; color: #059669; }
    .icon-indigo { background: #eef2ff; color: #4f46e5; }
    .icon-amber { background: #fffbeb; color: #d97706; }
    .kpi-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .kpi-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .kpi-value {
      font-size: 1.55rem;
      font-weight: 800;
      color: #0f172a;
    }
    .badge-role {
      font-size: 1rem;
      background: #f1f5f9;
      padding: 4px 10px;
      border-radius: 6px;
      width: fit-content;
      color: #2563eb;
    }
    .kpi-sub {
      font-size: 0.75rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
    }
    .kpi-sub.positive { color: #059669; }
    .kpi-sub.neutral { color: #64748b; }
    .dash-two-cols {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
      gap: 24px;
    }
    .panel-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      box-shadow: var(--shadow-sm);
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
    }
    .panel-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.1rem;
      color: #0f172a;
    }
    .panel-title i {
      font-size: 1.3rem;
      color: #2563eb;
    }
    .panel-link {
      font-size: 0.85rem;
      font-weight: 600;
      color: #2563eb;
      text-decoration: none;
    }
    .panel-link:hover { text-decoration: underline; }
    .recent-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .recent-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #f1f5f9;
    }
    .item-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .item-badge {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 2px 8px;
      background: #e2e8f0;
      color: #334155;
      border-radius: 6px;
    }
    .prod-icon {
      width: 32px;
      height: 32px;
      background: #eff6ff;
      color: #2563eb;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
    }
    .item-left strong {
      display: block;
      font-size: 0.9rem;
      color: #0f172a;
    }
    .item-left small {
      color: #64748b;
      font-size: 0.75rem;
    }
    .item-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .item-total {
      font-weight: 700;
      font-size: 0.9rem;
      color: #0f172a;
    }
    .status-chip {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 12px;
      text-transform: uppercase;
    }
    .status-chip.pendiente { background: #fef9c3; color: #854d0e; }
    .status-chip.confirmado { background: #e0f2fe; color: #0369a1; }
    .status-chip.enviado { background: #ede9fe; color: #6d28d9; }
    .status-chip.entregado { background: #dcfce7; color: #15803d; }
    .stock-pill {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 6px;
      background: #e2e8f0;
      color: #334155;
    }
    .stock-pill.low { background: #fee2e2; color: #dc2626; }
    .empty-hint {
      text-align: center;
      color: #94a3b8;
      padding: 24px;
      font-size: 0.9rem;
    }
    .arch-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      box-shadow: var(--shadow-sm);
    }
    .arch-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    .arch-header i {
      font-size: 1.8rem;
      color: #2563eb;
    }
    .arch-header h3 {
      font-size: 1.1rem;
      color: #0f172a;
      margin: 0;
    }
    .arch-header p {
      color: #64748b;
      font-size: 0.85rem;
      margin: 0;
    }
    .arch-pipeline {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      background: #f8fafc;
      padding: 20px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
    }
    .pipe-node {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 4px;
      min-width: 110px;
    }
    .node-icon {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      color: #2563eb;
      box-shadow: var(--shadow-sm);
    }
    .pipe-node strong {
      font-size: 0.82rem;
      color: #0f172a;
    }
    .pipe-node small {
      font-size: 0.7rem;
      color: #64748b;
    }
    .pipe-arrow {
      color: #94a3b8;
      font-size: 1.2rem;
    }
  `]
})
export class HomeComponent implements OnInit {
  productos: Producto[] = [];
  pedidos: Pedido[] = [];

  constructor(
    public authService: AuthService,
    private productosService: ProductosService,
    private pedidosService: PedidosService
  ) {}

  ngOnInit(): void {
    this.productosService.getProductos().subscribe({
      next: (data) => this.productos = data,
      error: () => {}
    });
    this.pedidosService.getPedidos().subscribe({
      next: (data) => this.pedidos = data,
      error: () => {}
    });
  }

  get totalFacturado(): number {
    return this.pedidos.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
  }

  get totalStock(): number {
    return this.productos.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
  }
}
