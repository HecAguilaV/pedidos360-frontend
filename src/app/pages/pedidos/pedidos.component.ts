import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PedidosService } from '../../services/pedidos.service';
import { EnviosService } from '../../services/envios.service';
import { AuthService } from '../../services/auth.service';
import { Pedido } from '../../models/pedido.model';

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-shell">
      <div class="alert-banner" *ngIf="message" [class.error]="isError" [class.success]="!isError">
        <span>
          <i class="ph" [class.ph-check-circle]="!isError" [class.ph-warning-circle]="isError"></i>
          {{ message }}
        </span>
        <button class="btn-danger-ghost" (click)="message = ''"><i class="ph ph-x"></i></button>
      </div>

      <!-- Page Header (Role-Adapted) -->
      <div class="page-header">
        <div>
          <span class="page-eyebrow">
            <i class="ph ph-receipt"></i>
            {{ (authService.isAdmin() || authService.isDespachador()) ? 'Gestión Comercial' : 'Cuenta de Cliente' }}
          </span>
          <h1 class="page-title">
            {{ (authService.isAdmin() || authService.isDespachador()) ? 'Gestión de Órdenes de Compra' : 'Mis Compras' }}
          </h1>
          <p class="page-subtitle">
            {{ (authService.isAdmin() || authService.isDespachador())
                ? 'Control de pedidos, estado de pago y seguimiento de despachos en Pesos Chilenos (CLP).'
                : 'Revisa el detalle de tus pedidos realizados, comprobantes con IVA y estado de despacho.' }}
          </p>
        </div>

        <div class="page-actions">
          <button class="btn btn-outline" (click)="loadPedidos()">
            <i class="ph ph-arrows-clockwise"></i>
            <span>Actualizar</span>
          </button>
          <button class="btn btn-blue" *ngIf="authService.isAdmin()" (click)="openModal()">
            <i class="ph ph-plus"></i>
            <span>Nueva Orden Manual</span>
          </button>
        </div>
      </div>

      <!-- KPI Strip for Admin / Dispatcher -->
      <div class="kpi-strip" *ngIf="authService.isAdmin() || authService.isDespachador()">
        <div class="kpi-card">
          <div class="kpi-header">
            <span>Total Órdenes</span>
            <i class="ph ph-receipt"></i>
          </div>
          <div class="kpi-value">{{ pedidos.length }}</div>
          <div class="kpi-meta">Registradas en el sistema</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header">
            <span>Ventas Totales (CLP)</span>
            <i class="ph ph-currency-dollar"></i>
          </div>
          <div class="kpi-value">\${{ totalFacturado | number:'1.0-0' }}</div>
          <div class="kpi-meta">Monto bruto con IVA (19%)</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header">
            <span>En Proceso / Pendientes</span>
            <i class="ph ph-clock"></i>
          </div>
          <div class="kpi-value">{{ ordenesPendientes }}</div>
          <div class="kpi-meta">Esperando confirmación de pago</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header">
            <span>Pagadas / Confirmadas</span>
            <i class="ph ph-check-circle"></i>
          </div>
          <div class="kpi-value">{{ ordenesPagadas }}</div>
          <div class="kpi-meta">Listas para despacho</div>
        </div>
      </div>

      <!-- Search & Status Filter Toolbar -->
      <div class="toolbar-bar">
        <div class="search-box">
          <i class="ph ph-magnifying-glass"></i>
          <input
            type="text"
            [(ngModel)]="searchTerm"
            placeholder="Buscar por número de orden, cliente o estado..."
          />
        </div>

        <div class="filter-pills">
          <button
            type="button"
            class="filter-pill"
            [class.active]="filterEstado === 'TODOS'"
            (click)="filterEstado = 'TODOS'">
            Todas ({{ pedidos.length }})
          </button>
          <button
            type="button"
            class="filter-pill"
            [class.active]="filterEstado === 'PENDIENTE'"
            (click)="filterEstado = 'PENDIENTE'">
            Pendientes
          </button>
          <button
            type="button"
            class="filter-pill"
            [class.active]="filterEstado === 'PAGADO'"
            (click)="filterEstado = 'PAGADO'">
            Pagadas
          </button>
          <button
            type="button"
            class="filter-pill"
            [class.active]="filterEstado === 'CONFIRMADO'"
            (click)="filterEstado = 'CONFIRMADO'">
            Confirmadas
          </button>
          <button
            type="button"
            class="filter-pill"
            [class.active]="filterEstado === 'ENVIADO'"
            (click)="filterEstado = 'ENVIADO'">
            En Camino
          </button>
          <button
            type="button"
            class="filter-pill"
            [class.active]="filterEstado === 'ENTREGADO'"
            (click)="filterEstado = 'ENTREGADO'">
            Entregadas
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div class="crm-card empty-box" *ngIf="loading && pedidos.length === 0">
        <i class="ph ph-spinner ph-spin"></i>
        <h4>Cargando órdenes...</h4>
        <p>Obteniendo historial de compras actualizado.</p>
      </div>

      <!-- =====================================================================
           ADMIN / DISPATCHER VIEW: CRM ORDERS TABLE (T17)
           ===================================================================== -->
      <div class="crm-card" *ngIf="!loading && (authService.isAdmin() || authService.isDespachador())">
        <div class="crm-card-header">
          <div class="crm-card-title">
            <i class="ph ph-table"></i>
            <span>Listado de Órdenes ({{ filteredPedidos.length }})</span>
          </div>
        </div>

        <div class="crm-table-wrap" *ngIf="filteredPedidos.length > 0">
          <table class="crm-table">
            <thead>
              <tr>
                <th>Orden</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Artículos</th>
                <th>Neto (CLP)</th>
                <th>IVA 19%</th>
                <th>Total (CLP)</th>
                <th>Estado</th>
                <th style="text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let ped of filteredPedidos">
                <td><span class="mono-code">#{{ ped.id }}</span></td>
                <td>{{ ped.fecha ? (ped.fecha | date:'dd/MM/yyyy HH:mm') : 'Reciente' }}</td>
                <td>
                  <strong>{{ ped.cliente }}</strong>
                  <div *ngIf="ped.clienteEmail" style="font-size: 0.76rem; color: var(--corp-500);">
                    {{ ped.clienteEmail }}
                  </div>
                </td>
                <td>
                  <span *ngIf="ped.items && ped.items.length > 0">
                    {{ ped.items[0].productName }} (x{{ ped.items[0].quantity }})
                    <small *ngIf="ped.items.length > 1" style="color: var(--corp-500);">
                      +{{ ped.items.length - 1 }} más
                    </small>
                  </span>
                  <span *ngIf="!ped.items || ped.items.length === 0" style="color: var(--corp-500);">
                    Orden directa
                  </span>
                </td>
                <td>\${{ calcNeto(ped.total) | number:'1.0-0' }}</td>
                <td>\${{ calcIva(ped.total) | number:'1.0-0' }}</td>
                <td class="price-clp">\${{ ped.total | number:'1.0-0' }}</td>
                <td>
                  <span class="status-pill" [ngClass]="getStatusBadgeClass(ped.estado)">
                    {{ ped.estado }}
                  </span>
                </td>
                <td style="text-align: right;">
                  <div style="display: inline-flex; gap: 6px; align-items: center;">
                    <button class="btn btn-outline btn-sm" (click)="irATracking(ped.id!)">
                      <i class="ph ph-truck"></i>
                      <span>Despacho</span>
                    </button>
                    <button
                      *ngIf="authService.isAdmin()"
                      class="btn-danger-ghost"
                      (click)="deletePedido(ped.id!)"
                      title="Eliminar orden">
                      <i class="ph ph-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="empty-box" *ngIf="filteredPedidos.length === 0">
          <i class="ph ph-receipt"></i>
          <h4>No hay órdenes para mostrar</h4>
          <p>No se encontraron pedidos con los criterios seleccionados.</p>
        </div>
      </div>

      <!-- =====================================================================
           CLIENT VIEW: MIS COMPRAS CARDS (T15)
           ===================================================================== -->
      <div class="client-orders-list" *ngIf="!loading && !authService.isAdmin() && !authService.isDespachador()">
        <article class="crm-card client-order-card" *ngFor="let ped of filteredPedidos">
          <div class="client-order-top">
            <div class="client-order-id-group">
              <span class="mono-code">ORDEN #{{ ped.id }}</span>
              <span class="client-order-date">
                <i class="ph ph-calendar-blank"></i>
                {{ ped.fecha ? (ped.fecha | date:'dd/MM/yyyy · HH:mm') : 'Reciente' }}
              </span>
            </div>
            <span class="status-pill" [ngClass]="getStatusBadgeClass(ped.estado)">
              {{ ped.estado }}
            </span>
          </div>

          <div class="client-order-body">
            <div class="client-order-items">
              <strong>Detalle de tu compra</strong>
              <ul *ngIf="ped.items && ped.items.length > 0">
                <li *ngFor="let item of ped.items">
                  <span>{{ item.quantity }}x {{ item.productName }} ({{ item.productCode }})</span>
                  <span>\${{ (item.unitPrice * item.quantity) | number:'1.0-0' }}</span>
                </li>
              </ul>
              <p *ngIf="!ped.items || ped.items.length === 0">
                Pedido registrado a nombre de {{ ped.cliente }}.
              </p>
            </div>

            <div class="client-order-totals">
              <div class="tot-row">
                <span>Monto Neto:</span>
                <span>\${{ calcNeto(ped.total) | number:'1.0-0' }}</span>
              </div>
              <div class="tot-row">
                <span>IVA (19%):</span>
                <span>\${{ calcIva(ped.total) | number:'1.0-0' }}</span>
              </div>
              <div class="tot-row final">
                <span>Total Pagado (CLP):</span>
                <strong class="price-clp">\${{ ped.total | number:'1.0-0' }}</strong>
              </div>
            </div>
          </div>

          <div class="client-order-footer">
            <span class="client-buyer-note">
              <i class="ph ph-user"></i> {{ ped.cliente }}
            </span>
            <button class="btn btn-primary btn-sm" (click)="irATracking(ped.id!)">
              <i class="ph ph-truck"></i>
              <span>Ver Seguimiento de Envío</span>
            </button>
          </div>
        </article>

        <div class="crm-card empty-box" *ngIf="filteredPedidos.length === 0">
          <i class="ph ph-shopping-bag-open"></i>
          <h4>Aún no tienes compras registradas</h4>
          <p>Explora nuestra tienda para realizar tu primer pedido.</p>
        </div>
      </div>

      <!-- =====================================================================
           MODAL: CREATE MANUAL ORDER (ADMIN ONLY, CLP)
           ===================================================================== -->
      <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">
        <div class="modal-dialog" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Registrar Orden Manual</h3>
            <button class="btn-danger-ghost" (click)="closeModal()"><i class="ph ph-x"></i></button>
          </div>
          <form (ngSubmit)="onSubmit()">
            <div class="modal-body">
              <div class="form-field">
                <label>Cliente o Razón Social *</label>
                <input
                  type="text"
                  class="form-input"
                  [(ngModel)]="newPedido.cliente"
                  name="cliente"
                  placeholder="Ej. Constructora Andina SpA"
                  required />
              </div>

              <div class="form-field">
                <label>Correo del Cliente</label>
                <input
                  type="email"
                  class="form-input"
                  [(ngModel)]="newPedido.clienteEmail"
                  name="clienteEmail"
                  placeholder="contacto@empresa.cl" />
              </div>

              <div class="form-grid-2">
                <div class="form-field">
                  <label>Estado Inicial *</label>
                  <select class="form-select" [(ngModel)]="newPedido.estado" name="estado">
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="CONFIRMADO">CONFIRMADO</option>
                    <option value="PAGADO">PAGADO</option>
                  </select>
                </div>

                <div class="form-field">
                  <label>Monto Total en CLP (IVA incl.) *</label>
                  <input
                    type="number"
                    class="form-input"
                    [(ngModel)]="newPedido.total"
                    name="total"
                    min="1"
                    step="10"
                    placeholder="Ej. 299990"
                    required />
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" (click)="closeModal()">Cancelar</button>
              <button
                type="submit"
                class="btn btn-blue"
                [disabled]="loading || !newPedido.cliente || newPedido.total <= 0">
                Registrar Orden
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .client-orders-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .client-order-card {
      padding: 0;
    }
    .client-order-top {
      padding: 14px 20px;
      background: var(--corp-50);
      border-bottom: 1px solid var(--corp-200);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .client-order-id-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .client-order-date {
      font-size: 0.8rem;
      color: var(--corp-500);
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .client-order-body {
      padding: 18px 20px;
      display: grid;
      grid-template-columns: 1fr 260px;
      gap: 24px;
      align-items: start;
    }
    .client-order-items strong {
      display: block;
      font-size: 0.85rem;
      color: var(--corp-700);
      margin-bottom: 8px;
    }
    .client-order-items ul {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .client-order-items li {
      display: flex;
      justify-content: space-between;
      font-size: 0.86rem;
      color: var(--corp-800);
      padding-bottom: 4px;
      border-bottom: 1px dashed var(--corp-200);
    }
    .client-order-items p {
      font-size: 0.86rem;
      color: var(--corp-600);
    }
    .client-order-totals {
      background: var(--corp-50);
      border: 1px solid var(--corp-200);
      border-radius: var(--radius-sm);
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .tot-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: var(--corp-600);
    }
    .tot-row.final {
      padding-top: 6px;
      border-top: 1px solid var(--corp-200);
      font-size: 0.9rem;
      color: var(--corp-900);
    }
    .client-order-footer {
      padding: 12px 20px;
      border-top: 1px solid var(--corp-100);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .client-buyer-note {
      font-size: 0.8rem;
      color: var(--corp-500);
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    @media (max-width: 768px) {
      .client-order-body {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PedidosComponent implements OnInit {
  pedidos: Pedido[] = [];
  loading = false;
  showModal = false;
  searchTerm = '';
  filterEstado = 'TODOS';

  message = '';
  isError = false;

  newPedido: Pedido = {
    cliente: '',
    clienteEmail: '',
    estado: 'PENDIENTE',
    total: 0
  };

  constructor(
    private pedidosService: PedidosService,
    private enviosService: EnviosService,
    public authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    const cached = this.pedidosService.cachedPedidos?.();
    if (cached && cached.length > 0) {
      this.pedidos = [...cached];
      this.loading = false;
      this.cdr.detectChanges();
    } else {
      this.loading = true;
    }
    this.loadPedidos();
  }

  get totalFacturado(): number {
    return this.pedidos.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
  }

  get ordenesPendientes(): number {
    return this.pedidos.filter(p => p.estado === 'PENDIENTE').length;
  }

  get ordenesPagadas(): number {
    return this.pedidos.filter(p => p.estado === 'PAGADO' || p.estado === 'CONFIRMADO' || p.estado === 'ENVIADO' || p.estado === 'ENTREGADO').length;
  }

  get filteredPedidos(): Pedido[] {
    return this.pedidos.filter(p => {
      if (this.filterEstado !== 'TODOS' && p.estado !== this.filterEstado) {
        return false;
      }
      if (this.searchTerm.trim()) {
        const term = this.searchTerm.toLowerCase();
        const matchesClient = p.cliente.toLowerCase().includes(term);
        const matchesId = p.id?.toString().includes(term);
        const matchesStatus = p.estado.toLowerCase().includes(term);
        if (!matchesClient && !matchesId && !matchesStatus) return false;
      }
      return true;
    });
  }

  calcNeto(total: number): number {
    return Math.round((Number(total) || 0) / 1.19);
  }

  calcIva(total: number): number {
    const t = Number(total) || 0;
    return t - this.calcNeto(t);
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
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

  loadPedidos(): void {
    if (this.pedidos.length === 0) {
      this.loading = true;
    }
    this.pedidosService.getPedidos().subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          this.pedidos = data;
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Error al cargar pedidos:', err);
        this.ngZone.run(() => {
          this.message = 'No se pudo cargar el listado de órdenes en este momento.';
          this.isError = true;
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  irATracking(orderId: number): void {
    this.enviosService.obtenerPorOrden(orderId).subscribe((envio) => {
      if (envio && envio.numeroGuia) {
        this.router.navigate(['/tracking'], { queryParams: { guia: envio.numeroGuia } });
      } else {
        this.router.navigate(['/tracking'], { queryParams: { orden: orderId } });
      }
    });
  }

  openModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  onSubmit(): void {
    if (!this.newPedido.cliente || this.newPedido.total <= 0) return;
    this.loading = true;
    this.pedidosService.createPedido(this.newPedido).subscribe({
      next: (created) => {
        this.ngZone.run(() => {
          this.message = `Orden #${created.id} registrada correctamente.`;
          this.isError = false;
          this.newPedido = { cliente: '', clienteEmail: '', estado: 'PENDIENTE', total: 0 };
          this.closeModal();
          this.cdr.detectChanges();
        });
        this.loadPedidos();
      },
      error: (err) => {
        console.error('Error al crear pedido:', err);
        this.ngZone.run(() => {
          this.message = 'No se pudo registrar la orden.';
          this.isError = true;
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  deletePedido(id: number): void {
    if (!confirm(`¿Confirmas eliminar la orden #${id}?`)) return;
    this.pedidosService.deletePedido(id).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.message = `Orden #${id} eliminada.`;
          this.isError = false;
          this.cdr.detectChanges();
        });
        this.loadPedidos();
      },
      error: (err) => {
        console.error('Error al eliminar pedido:', err);
        this.ngZone.run(() => {
          this.message = 'No tienes permisos para eliminar esta orden o ocurrió un error.';
          this.isError = true;
          this.cdr.detectChanges();
        });
      }
    });
  }
}
