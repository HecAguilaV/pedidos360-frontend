import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ProductosService } from '../../services/productos.service';
import { PedidosService } from '../../services/pedidos.service';
import { CartService } from '../../services/cart.service';
import { Producto } from '../../models/producto.model';
import { Pedido } from '../../models/pedido.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard-page">
      <!-- Welcome Header -->
      <section class="dash-hero">
        <div class="hero-top">
          <span class="platform-badge">
            <i class="ph ph-cube-transparent"></i>
            <span>PLATAFORMA CLOUD NATIVE · EVENT-DRIVEN ENTERPRISE</span>
          </span>
          <div class="cloud-pill">
            <span class="dot-live"></span>
            <span>Multi-Cloud: Azure Entra ID + AWS EC2 & RDS</span>
          </div>
        </div>

        <div class="hero-content">
          <div>
            <h1>Centro de Control & Arquitectura Pedidos360</h1>
            <p>
              Supervisión en tiempo real de operaciones de e-commerce, stock en PostgreSQL y core coreografiado con RabbitMQ.
            </p>
          </div>
          <div class="hero-cta-group">
            <a routerLink="/productos" class="btn-hero-primary">
              <i class="ph ph-storefront"></i> Explorar Catálogo
            </a>
            <a routerLink="/tracking" class="btn-hero-secondary">
              <i class="ph ph-truck"></i> Rastreo en Vivo
            </a>
          </div>
        </div>
      </section>

      <!-- KPI Grid -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon-box blue">
            <i class="ph ph-receipt"></i>
          </div>
          <div class="kpi-text">
            <span class="kpi-title">Órdenes Totales</span>
            <strong class="kpi-number">{{ pedidos.length }}</strong>
            <span class="kpi-tag positive"><i class="ph ph-trend-up"></i> PostgreSQL Cloud</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-box emerald">
            <i class="ph ph-currency-dollar"></i>
          </div>
          <div class="kpi-text">
            <span class="kpi-title">Volumen Transaccionado</span>
            <strong class="kpi-number">\${{ totalFacturado | number:'1.2-2' }}</strong>
            <span class="kpi-tag positive"><i class="ph ph-check-circle"></i> Asíncrono RabbitMQ</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-box purple">
            <i class="ph ph-hard-drives"></i>
          </div>
          <div class="kpi-text">
            <span class="kpi-title">Inventario Activo</span>
            <strong class="kpi-number">{{ totalStock }} <small>unid.</small></strong>
            <span class="kpi-tag neutral"><i class="ph ph-stack"></i> {{ productos.length }} modelos enterprise</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-box amber">
            <i class="ph ph-shield-check"></i>
          </div>
          <div class="kpi-text">
            <span class="kpi-title">Identidad & Rol</span>
            <strong class="kpi-number role-badge">{{ authService.isAdmin() ? 'ADMIN' : 'USER' }}</strong>
            <span class="kpi-tag neutral"><i class="ph ph-key"></i> Azure Entra ID Claims</span>
          </div>
        </div>
      </section>

      <!-- Arquitectura de Microservicios & Pipeline -->
      <section class="arch-showcase-card">
        <div class="arch-card-header">
          <div class="arch-header-title">
            <i class="ph ph-git-network"></i>
            <div>
              <h3>Arquitectura Event-Driven Coreografiada (RabbitMQ)</h3>
              <p>Topología desacoplada de 5 microservicios Spring Boot interactuando mediante mensajería AMQP</p>
            </div>
          </div>
          <span class="eda-badge">EDA v2.0.0</span>
        </div>

        <div class="pipeline-flow-container">
          <div class="flow-step">
            <div class="step-card">
              <i class="ph ph-browser"></i>
              <strong>Angular 22 SPA</strong>
              <small>:4200 Storefront</small>
            </div>
          </div>

          <div class="flow-arrow"><i class="ph ph-arrow-right"></i></div>

          <div class="flow-step">
            <div class="step-card">
              <i class="ph ph-shield-check"></i>
              <strong>Azure Entra ID</strong>
              <small>OAuth2 / JWT PKCE</small>
            </div>
          </div>

          <div class="flow-arrow"><i class="ph ph-arrow-right"></i></div>

          <div class="flow-step">
            <div class="step-card">
              <i class="ph ph-cloud"></i>
              <strong>AWS API Gateway</strong>
              <small>HTTP API / JWT Auth</small>
            </div>
          </div>

          <div class="flow-arrow"><i class="ph ph-arrow-right"></i></div>

          <div class="flow-step">
            <div class="step-card active-broker">
              <i class="ph ph-lightning"></i>
              <strong>pedidos-service</strong>
              <small>:8081 Publisher</small>
            </div>
          </div>

          <div class="flow-arrow highlight"><i class="ph ph-arrow-right"></i></div>

          <div class="flow-step">
            <div class="step-card broker-card">
              <i class="ph ph-rabbitmq-logo"></i>
              <strong>RabbitMQ 3</strong>
              <small>orders.exchange</small>
            </div>
          </div>

          <div class="flow-arrow highlight"><i class="ph ph-arrow-right"></i></div>

          <div class="flow-step">
            <div class="step-card">
              <i class="ph ph-paper-plane-tilt"></i>
              <strong>3x Consumers</strong>
              <small>Stock, Envios, Email</small>
            </div>
          </div>
        </div>
      </section>

      <!-- Dos Columnas: Actividad Reciente y Catálogo Rápido -->
      <section class="dash-columns">
        <!-- Últimas Órdenes -->
        <div class="dash-panel">
          <div class="panel-header">
            <div class="panel-title">
              <i class="ph ph-clock-counter-clockwise"></i>
              <h3>Últimas Órdenes Emitidas</h3>
            </div>
            <a routerLink="/pedidos" class="panel-link">Ver todas →</a>
          </div>

          <div class="panel-body">
            <div *ngIf="pedidos.length === 0" class="panel-empty">
              <i class="ph ph-receipt"></i>
              <p>No hay órdenes registradas aún en el sistema.</p>
            </div>

            <div class="items-list" *ngIf="pedidos.length > 0">
              <div class="list-row" *ngFor="let ped of pedidos.slice(0, 4)">
                <div class="row-left">
                  <span class="row-badge">#{{ ped.id }}</span>
                  <div>
                    <strong>{{ ped.cliente }}</strong>
                    <small>{{ ped.fecha | date:'dd MMM yyyy · HH:mm' }}</small>
                  </div>
                </div>
                <div class="row-right">
                  <span class="status-chip" [ngClass]="ped.estado.toLowerCase()">{{ ped.estado }}</span>
                  <span class="row-total">\${{ ped.total | number:'1.2-2' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Equipos Destacados -->
        <div class="dash-panel">
          <div class="panel-header">
            <div class="panel-title">
              <i class="ph ph-hard-drive"></i>
              <h3>Equipos en Bodega Central</h3>
            </div>
            <a routerLink="/productos" class="panel-link">Ir a tienda →</a>
          </div>

          <div class="panel-body">
            <div *ngIf="productos.length === 0" class="panel-empty">
              <i class="ph ph-package"></i>
              <p>No hay productos en catálogo.</p>
            </div>

            <div class="items-list" *ngIf="productos.length > 0">
              <div class="list-row" *ngFor="let prod of productos.slice(0, 4)">
                <div class="row-left">
                  <div class="prod-thumb"><i class="ph ph-cpu"></i></div>
                  <div>
                    <strong>{{ prod.nombre }}</strong>
                    <small>{{ prod.codigo || 'SKU-P360' }}</small>
                  </div>
                </div>
                <div class="row-right">
                  <span class="stock-chip" [class.low]="prod.stock < 10">{{ prod.stock }} unid.</span>
                  <span class="row-total">\${{ prod.precio | number:'1.2-2' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .dashboard-page {
      max-width: 1400px;
      margin: 0 auto;
      padding: 32px 24px 64px 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Hero */
    .dash-hero {
      background: var(--surface-white);
      border: 1px solid var(--corp-200);
      border-radius: var(--radius-lg);
      padding: 28px 32px;
      box-shadow: var(--shadow-subtle);
    }

    .hero-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .platform-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.72rem;
      font-weight: 800;
      color: var(--corp-600);
      letter-spacing: 0.6px;
    }

    .platform-badge i {
      color: var(--brand-blue);
      font-size: 1.1rem;
    }

    .cloud-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--corp-600);
      background: var(--corp-50);
      padding: 4px 12px;
      border-radius: var(--radius-full);
      border: 1px solid var(--corp-200);
    }

    .dot-live {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--commerce-emerald);
      box-shadow: 0 0 6px var(--commerce-emerald);
    }

    .hero-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 24px;
    }

    .hero-content h1 {
      font-size: 1.85rem;
      font-weight: 800;
      color: var(--corp-900);
      letter-spacing: -0.6px;
      margin-bottom: 6px;
    }

    .hero-content p {
      font-size: 0.95rem;
      color: var(--corp-500);
      max-width: 680px;
      line-height: 1.5;
    }

    .hero-cta-group {
      display: flex;
      gap: 12px;
      flex-shrink: 0;
    }

    .btn-hero-primary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--corp-900);
      color: var(--surface-white);
      padding: 10px 18px;
      border-radius: var(--radius-md);
      font-size: 0.88rem;
      font-weight: 700;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
      transition: all 0.2s;
    }

    .btn-hero-primary:hover {
      background: var(--corp-800);
      transform: translateY(-1px);
    }

    .btn-hero-secondary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--corp-100);
      color: var(--corp-700);
      padding: 10px 18px;
      border-radius: var(--radius-md);
      font-size: 0.88rem;
      font-weight: 700;
      transition: all 0.2s;
    }

    .btn-hero-secondary:hover {
      background: var(--corp-200);
      color: var(--corp-900);
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
    }

    .kpi-card {
      background: var(--surface-white);
      border: 1px solid var(--corp-200);
      border-radius: var(--radius-lg);
      padding: 22px;
      display: flex;
      align-items: flex-start;
      gap: 16px;
      box-shadow: var(--shadow-subtle);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-hover);
    }

    .kpi-icon-box {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      flex-shrink: 0;
    }

    .kpi-icon-box.blue { background: var(--brand-blue-subtle); color: var(--brand-blue); }
    .kpi-icon-box.emerald { background: var(--commerce-emerald-subtle); color: var(--commerce-emerald); }
    .kpi-icon-box.purple { background: #ede9fe; color: #6d28d9; }
    .kpi-icon-box.amber { background: var(--status-warning-subtle); color: var(--status-warning); }

    .kpi-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .kpi-title {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--corp-500);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .kpi-number {
      font-size: 1.55rem;
      font-weight: 800;
      color: var(--corp-900);
      letter-spacing: -0.3px;
    }

    .role-badge {
      font-size: 1.15rem;
      color: var(--brand-blue);
    }

    .kpi-tag {
      font-size: 0.72rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
    }

    .kpi-tag.positive { color: var(--commerce-emerald); }
    .kpi-tag.neutral { color: var(--corp-500); }

    /* Architecture Showcase */
    .arch-showcase-card {
      background: var(--surface-white);
      border: 1px solid var(--corp-200);
      border-radius: var(--radius-lg);
      padding: 28px 32px;
      box-shadow: var(--shadow-subtle);
    }

    .arch-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .arch-header-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .arch-header-title i {
      font-size: 26px;
      color: var(--brand-blue);
    }

    .arch-header-title h3 {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--corp-900);
      margin: 0;
    }

    .arch-header-title p {
      font-size: 0.85rem;
      color: var(--corp-500);
      margin-top: 2px;
    }

    .eda-badge {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      font-weight: 800;
      background: var(--brand-blue-subtle);
      color: var(--brand-blue);
      padding: 4px 10px;
      border-radius: var(--radius-full);
      border: 1px solid rgba(29, 78, 216, 0.2);
    }

    .pipeline-flow-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--corp-50);
      padding: 24px;
      border-radius: var(--radius-md);
      border: 1px solid var(--corp-200);
      overflow-x: auto;
      gap: 12px;
    }

    .flow-step {
      flex: 1;
      min-width: 130px;
    }

    .step-card {
      background: var(--surface-white);
      border: 1px solid var(--corp-200);
      border-radius: var(--radius-md);
      padding: 16px 12px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      transition: transform 0.15s;
    }

    .step-card:hover {
      transform: translateY(-2px);
    }

    .step-card i {
      font-size: 24px;
      color: var(--brand-blue);
      margin-bottom: 2px;
    }

    .step-card strong {
      font-size: 0.82rem;
      color: var(--corp-900);
    }

    .step-card small {
      font-size: 0.7rem;
      color: var(--corp-500);
      font-family: var(--font-mono);
    }

    .step-card.active-broker {
      border-color: rgba(29, 78, 216, 0.3);
      background: #f8faff;
    }

    .step-card.broker-card {
      border-color: #f97316;
      background: #fff7ed;
    }

    .step-card.broker-card i {
      color: #ea580c;
    }

    .flow-arrow {
      color: var(--corp-300);
      font-size: 1.2rem;
      flex-shrink: 0;
    }

    .flow-arrow.highlight {
      color: #ea580c;
    }

    /* Columns */
    .dash-columns {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
      gap: 24px;
    }

    .dash-panel {
      background: var(--surface-white);
      border: 1px solid var(--corp-200);
      border-radius: var(--radius-lg);
      padding: 24px;
      box-shadow: var(--shadow-subtle);
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
      font-size: 1.05rem;
      color: var(--corp-900);
    }

    .panel-title i {
      font-size: 1.25rem;
      color: var(--brand-blue);
    }

    .panel-link {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--brand-blue);
    }

    .panel-empty {
      padding: 32px;
      text-align: center;
      color: var(--corp-400);
    }

    .panel-empty i {
      font-size: 2rem;
      margin-bottom: 8px;
    }

    .items-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .list-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 14px;
      border-radius: var(--radius-md);
      background: var(--corp-50);
      border: 1px solid var(--corp-100);
    }

    .row-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .row-badge {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      font-weight: 700;
      padding: 2px 6px;
      background: var(--corp-200);
      color: var(--corp-800);
      border-radius: var(--radius-sm);
    }

    .prod-thumb {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      background: var(--brand-blue-subtle);
      color: var(--brand-blue);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }

    .row-left strong {
      display: block;
      font-size: 0.88rem;
      color: var(--corp-900);
    }

    .row-left small {
      font-size: 0.75rem;
      color: var(--corp-500);
    }

    .row-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .row-total {
      font-weight: 800;
      font-size: 0.92rem;
      color: var(--corp-900);
      font-feature-settings: 'tnum';
    }

    .status-chip {
      font-size: 0.68rem;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      text-transform: uppercase;
    }

    .status-chip.pendiente { background: var(--status-warning-subtle); color: var(--status-warning); }
    .status-chip.confirmado { background: var(--brand-blue-subtle); color: var(--brand-blue); }
    .status-chip.enviado { background: #ede9fe; color: #6d28d9; }
    .status-chip.entregado { background: var(--commerce-emerald-subtle); color: var(--commerce-emerald); }

    .stock-chip {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      background: var(--corp-200);
      color: var(--corp-700);
    }

    .stock-chip.low {
      background: var(--status-danger-subtle);
      color: var(--status-danger);
    }
  `]
})
export class HomeComponent implements OnInit {
  productos: Producto[] = [];
  pedidos: Pedido[] = [];

  constructor(
    public authService: AuthService,
    private productosService: ProductosService,
    private pedidosService: PedidosService,
    public cartService: CartService
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
