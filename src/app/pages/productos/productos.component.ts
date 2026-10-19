import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductosService } from '../../services/productos.service';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { Producto } from '../../models/producto.model';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-shell">
      <!-- Feedback Banner -->
      <div class="alert-banner" *ngIf="message" [class.error]="isError" [class.success]="!isError">
        <span>
          <i class="ph" [class.ph-check-circle]="!isError" [class.ph-warning-circle]="isError"></i>
          {{ message }}
        </span>
        <button class="btn-danger-ghost" (click)="message = ''"><i class="ph ph-x"></i></button>
      </div>

      <!-- =====================================================================
           ADMIN VIEW: CRM INVENTORY BACKOFFICE (T17)
           ===================================================================== -->
      <ng-container *ngIf="authService.isAdmin()">
        <div class="page-header">
          <div>
            <span class="page-eyebrow"><i class="ph ph-boxes"></i> Backoffice Comercial</span>
            <h1 class="page-title">Catálogo e Inventario</h1>
            <p class="page-subtitle">Administración de productos, control de existencias y precios en Pesos Chilenos (CLP).</p>
          </div>
          <div class="page-actions">
            <div class="view-mode-tabs">
              <button 
                type="button" 
                class="btn" 
                [ngClass]="activeView === 'catalog' ? 'btn-blue' : 'btn-outline'"
                (click)="activeView = 'catalog'">
                <i class="ph ph-storefront"></i>
                <span>Vista Catálogo</span>
              </button>
              <button 
                type="button" 
                class="btn" 
                [ngClass]="activeView === 'crm' ? 'btn-blue' : 'btn-outline'"
                (click)="activeView = 'crm'">
                <i class="ph ph-table"></i>
                <span>Maestro CRM</span>
              </button>
            </div>
            <button class="btn btn-outline" (click)="loadProductos()">
              <i class="ph ph-arrows-clockwise" [class.ph-spin]="loading"></i>
              <span>Actualizar</span>
            </button>
            <button class="btn btn-blue" (click)="openModal()">
              <i class="ph ph-plus"></i>
              <span>Nuevo Producto</span>
            </button>
          </div>
        </div>

        <!-- Admin KPI Strip -->
        <div class="kpi-strip">
          <div class="kpi-card">
            <div class="kpi-header">
              <span>SKUs Activos</span>
              <i class="ph ph-barcode"></i>
            </div>
            <div class="kpi-value">{{ productos.length }}</div>
            <div class="kpi-meta">Productos en catálogo</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <span>Unidades Totales</span>
              <i class="ph ph-stack"></i>
            </div>
            <div class="kpi-value">{{ totalStockUnits | number:'1.0-0' }}</div>
            <div class="kpi-meta">Disponibles para despacho</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <span>Valorización Inventario</span>
              <i class="ph ph-currency-dollar"></i>
            </div>
            <div class="kpi-value">\${{ totalInventoryValueClp | number:'1.0-0' }}</div>
            <div class="kpi-meta">Total estimado en CLP</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <span>Alertas de Stock</span>
              <i class="ph ph-warning"></i>
            </div>
            <div class="kpi-value">{{ lowStockCount }}</div>
            <div class="kpi-meta">Productos con menos de 10 unid.</div>
          </div>
        </div>
      </ng-container>

      <!-- =====================================================================
           CLIENT / GUEST HEADER: CLASSIC STOREFRONT BANNER (T15)
           ===================================================================== -->
      <div class="store-banner" *ngIf="!authService.isAdmin()">
        <div>
          <h1>Tecnología y Equipamiento Profesional</h1>
          <p>Compra en línea con despacho a todo Chile y seguimiento en tiempo real de tu pedido.</p>
        </div>
        <div class="store-trust-badges">
          <div class="trust-item">
            <i class="ph ph-truck"></i>
            <span>Despacho con Guía de Seguimiento</span>
          </div>
          <div class="trust-item">
            <i class="ph ph-receipt"></i>
            <span>Boleta / Factura con IVA (19%)</span>
          </div>
        </div>
      </div>

      <!-- Search & Filter Toolbar -->
      <div class="toolbar-bar">
        <div class="search-box">
          <i class="ph ph-magnifying-glass"></i>
          <input
            type="text"
            [(ngModel)]="searchTerm"
            placeholder="Buscar por nombre, código o descripción..."
          />
        </div>
        <div class="filter-pills">
          <button
            type="button"
            class="filter-pill"
            [class.active]="!onlyInStock"
            (click)="onlyInStock = false">
            Todos ({{ productos.length }})
          </button>
          <button
            type="button"
            class="filter-pill"
            [class.active]="onlyInStock"
            (click)="onlyInStock = true">
            Con Stock Disponible
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="crm-card empty-box" *ngIf="loading && productos.length === 0">
        <i class="ph ph-spinner ph-spin"></i>
        <h4>Cargando catálogo...</h4>
        <p>Obteniendo productos y disponibilidad actualizada.</p>
      </div>

      <!-- =====================================================================
           ADMIN CRM TABLE (Shown when Admin selects 'Maestro CRM' tab)
           ===================================================================== -->
      <div class="crm-card" *ngIf="authService.isAdmin() && activeView === 'crm'">
        <div class="crm-card-header">
          <div class="crm-card-title">
            <i class="ph ph-list-bullets"></i>
            <span>Maestro de Productos ({{ filteredProductos.length }})</span>
          </div>
        </div>

        <div class="crm-table-wrap" *ngIf="filteredProductos.length > 0">
          <table class="crm-table">
            <thead>
              <tr>
                <th>Código SKU</th>
                <th>Producto</th>
                <th>Descripción</th>
                <th>Precio (CLP)</th>
                <th>Stock</th>
                <th>Estado</th>
                <th style="text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let prod of filteredProductos">
                <td><span class="mono-code">{{ prod.codigo }}</span></td>
                <td><strong>{{ prod.nombre }}</strong></td>
                <td>{{ prod.descripcion || 'Sin descripción adicional' }}</td>
                <td class="price-clp">\${{ prod.precio | number:'1.0-0' }}</td>
                <td><strong>{{ prod.stock }}</strong> unid.</td>
                <td>
                  <span class="status-pill" [ngClass]="getStockBadgeClass(prod.stock)">
                    {{ getStockStatusText(prod.stock) }}
                  </span>
                </td>
                <td style="text-align: right;">
                  <button
                    class="btn-danger-ghost"
                    (click)="deleteProducto(prod.id!)"
                    title="Eliminar producto">
                    <i class="ph ph-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="empty-box" *ngIf="filteredProductos.length === 0">
          <i class="ph ph-package"></i>
          <h4>No se encontraron productos</h4>
          <p>Ajusta tu búsqueda o registra un nuevo producto en el catálogo.</p>
        </div>
      </div>

      <!-- =====================================================================
           STOREFRONT PRODUCT GRID (Default view for EVERYONE, including Admin)
           ===================================================================== -->
      <ng-container *ngIf="!authService.isAdmin() || activeView === 'catalog'">
        <div class="product-grid" *ngIf="filteredProductos.length > 0">
          <article class="product-card" *ngFor="let prod of filteredProductos">
            <div class="product-visual">
              <span class="product-sku-tag">{{ prod.codigo }}</span>
              <span class="product-stock-tag status-pill" [ngClass]="getStockBadgeClass(prod.stock)">
                {{ getStockStatusText(prod.stock) }}
              </span>
              <i class="ph" [ngClass]="getProductIcon(prod)"></i>
            </div>

            <div class="product-body">
              <h3 class="product-name">{{ prod.nombre }}</h3>
              <p class="product-desc">{{ prod.descripcion || 'Garantía oficial y despacho a domicilio.' }}</p>
            </div>

            <div class="product-footer">
              <div class="product-price-block">
                <span class="product-price-clp">\${{ prod.precio | number:'1.0-0' }}</span>
                <span class="product-tax-label">IVA (19%) incluido</span>
              </div>

              <div class="store-card-controls" *ngIf="!authService.isAdmin()">
                <div class="qty-box" *ngIf="prod.stock > 0">
                  <button type="button" (click)="decrementQty(prod.id!)">-</button>
                  <span>{{ getQty(prod.id!) }}</span>
                  <button type="button" (click)="incrementQty(prod.id!, prod.stock)">+</button>
                </div>

                <button
                  type="button"
                  class="btn"
                  [ngClass]="addedState[prod.id!] ? 'btn-emerald' : 'btn-blue'"
                  [disabled]="prod.stock <= 0"
                  (click)="agregarAlCarrito(prod)">
                  <i class="ph" [ngClass]="addedState[prod.id!] ? 'ph-check' : 'ph-shopping-cart-simple'"></i>
                  <span>{{ addedState[prod.id!] ? 'Agregado' : (prod.stock > 0 ? 'Agregar' : 'Agotado') }}</span>
                </button>
              </div>
            </div>
          </article>
        </div>

        <div class="crm-card empty-box" *ngIf="filteredProductos.length === 0 && !loading">
          <i class="ph ph-magnifying-glass"></i>
          <h4>Sin resultados para tu búsqueda</h4>
          <p>Intenta con otro término o revisa todos los productos disponibles.</p>
        </div>
      </ng-container>

      <!-- =====================================================================
           MODAL: CREATE PRODUCT (ADMIN ONLY, CLP)
           ===================================================================== -->
      <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">
        <div class="modal-dialog" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Registrar Nuevo Producto</h3>
            <button class="btn-danger-ghost" (click)="closeModal()"><i class="ph ph-x"></i></button>
          </div>
          <form (ngSubmit)="onSubmit()">
            <div class="modal-body">
              <div class="form-grid-2">
                <div class="form-field">
                  <label>Código SKU *</label>
                  <input
                    type="text"
                    class="form-input"
                    [(ngModel)]="newProducto.codigo"
                    name="codigo"
                    placeholder="Ej. PROD-005"
                    required />
                </div>
                <div class="form-field">
                  <label>Stock Inicial *</label>
                  <input
                    type="number"
                    class="form-input"
                    [(ngModel)]="newProducto.stock"
                    name="stock"
                    min="0"
                    required />
                </div>
              </div>

              <div class="form-field">
                <label>Nombre del Producto *</label>
                <input
                  type="text"
                  class="form-input"
                  [(ngModel)]="newProducto.nombre"
                  name="nombre"
                  placeholder="Ej. Audífonos Inalámbricos Noise Cancelling"
                  required />
              </div>

              <div class="form-field">
                <label>Precio de Venta en CLP (IVA incluido) *</label>
                <input
                  type="number"
                  class="form-input"
                  [(ngModel)]="newProducto.precio"
                  name="precio"
                  min="1"
                  step="10"
                  placeholder="Ej. 149990"
                  required />
              </div>

              <div class="form-field">
                <label>Descripción</label>
                <textarea
                  class="form-textarea"
                  rows="3"
                  [(ngModel)]="newProducto.descripcion"
                  name="descripcion"
                  placeholder="Características principales del producto..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" (click)="closeModal()">Cancelar</button>
              <button
                type="submit"
                class="btn btn-blue"
                [disabled]="loading || !newProducto.codigo || !newProducto.nombre || newProducto.precio <= 0">
                Guardar Producto
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .store-card-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .qty-box {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--corp-300);
      border-radius: var(--radius-sm);
      background: var(--corp-50);
    }
    .qty-box button {
      width: 26px;
      height: 30px;
      font-weight: 700;
      color: var(--corp-700);
    }
    .qty-box button:hover {
      background: var(--corp-200);
    }
    .qty-box span {
      width: 24px;
      text-align: center;
      font-size: 0.82rem;
      font-weight: 700;
    }
    .view-mode-tabs {
      display: inline-flex;
      gap: 4px;
      background: var(--corp-100);
      padding: 3px;
      border-radius: var(--radius-md);
      border: 1px solid var(--corp-200);
    }
    .view-mode-tabs .btn {
      padding: 6px 12px;
      font-size: 0.82rem;
      border-radius: var(--radius-sm);
    }
  `]
})
export class ProductosComponent implements OnInit {
  productos: Producto[] = [];
  loading = false;
  showModal = false;
  searchTerm = '';
  onlyInStock = false;
  private _userSelectedView: 'catalog' | 'crm' | null = null;

  get activeView(): 'catalog' | 'crm' {
    if (this._userSelectedView) {
      return this._userSelectedView;
    }
    return this.authService.isAdmin() ? 'crm' : 'catalog';
  }

  set activeView(val: 'catalog' | 'crm') {
    this._userSelectedView = val;
  }

  adminStorePreview = true;

  message = '';
  isError = false;

  addedState: { [id: number]: boolean } = {};
  quantities: { [id: number]: number } = {};

  newProducto: Producto = {
    codigo: '',
    nombre: '',
    descripcion: '',
    precio: 0,
    stock: 0
  };

  constructor(
    private productosService: ProductosService,
    public authService: AuthService,
    private cartService: CartService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    if (this.authService.isDespachador()) {
      this.router.navigate(['/tracking']);
      return;
    }
    // Instant cache hydration: zero blank screen, zero loading lag
    const cached = this.productosService.cachedProductos();
    if (cached && cached.length > 0) {
      this.productos = [...cached];
      this.loading = false;
      this.cdr.detectChanges();
    } else {
      this.loading = true;
    }
    this.loadProductos();
  }

  get filteredProductos(): Producto[] {
    return this.productos.filter(p => {
      if (this.onlyInStock && p.stock <= 0) {
        return false;
      }
      if (this.searchTerm.trim()) {
        const term = this.searchTerm.toLowerCase();
        const matchesName = p.nombre.toLowerCase().includes(term);
        const matchesDesc = p.descripcion?.toLowerCase().includes(term);
        const matchesCode = p.codigo?.toLowerCase().includes(term);
        if (!matchesName && !matchesDesc && !matchesCode) return false;
      }
      return true;
    });
  }

  get totalStockUnits(): number {
    return this.productos.reduce((acc, p) => acc + (p.stock || 0), 0);
  }

  get totalInventoryValueClp(): number {
    return this.productos.reduce((acc, p) => acc + (p.precio || 0) * (p.stock || 0), 0);
  }

  get lowStockCount(): number {
    return this.productos.filter(p => p.stock < 10).length;
  }

  loadProductos(): void {
    if (this.productos.length === 0) {
      this.loading = true;
    }
    this.productosService.getProductos().subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          this.productos = data;
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Error al cargar productos:', err);
        this.ngZone.run(() => {
          this.message = 'No fue posible cargar el catálogo en este momento.';
          this.isError = true;
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  getQty(productId: number): number {
    return this.quantities[productId] || 1;
  }

  incrementQty(productId: number, maxStock: number): void {
    const current = this.getQty(productId);
    if (current < maxStock) {
      this.quantities[productId] = current + 1;
    }
  }

  decrementQty(productId: number): void {
    const current = this.getQty(productId);
    if (current > 1) {
      this.quantities[productId] = current - 1;
    }
  }

  agregarAlCarrito(prod: Producto): void {
    const qty = this.getQty(prod.id!);
    this.cartService.agregarItem(prod.codigo || `PROD-${prod.id}`, prod.nombre, prod.precio, qty).subscribe({
      next: () => {
        this.addedState[prod.id!] = true;
        setTimeout(() => {
          this.addedState[prod.id!] = false;
        }, 1400);
      }
    });
  }

  getProductIcon(prod: Producto): string {
    const text = (prod.nombre + ' ' + (prod.descripcion || '')).toLowerCase();
    if (text.includes('laptop') || text.includes('notebook')) return 'ph-laptop';
    if (text.includes('mouse')) return 'ph-mouse';
    if (text.includes('teclado')) return 'ph-keyboard';
    if (text.includes('monitor') || text.includes('pantalla')) return 'ph-monitor';
    return 'ph-package';
  }

  getStockBadgeClass(stock: number): string {
    if (stock >= 10) return 'success';
    if (stock > 0) return 'warning';
    return 'danger';
  }

  getStockStatusText(stock: number): string {
    if (stock >= 10) return `Disponible (${stock})`;
    if (stock > 0) return `Últimas ${stock} unid.`;
    return 'Agotado';
  }

  openModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  onSubmit(): void {
    if (!this.newProducto.codigo || !this.newProducto.nombre) return;
    this.loading = true;
    this.productosService.createProducto(this.newProducto).subscribe({
      next: (created) => {
        this.ngZone.run(() => {
          this.message = `Producto "${created.nombre}" registrado correctamente.`;
          this.isError = false;
          this.newProducto = { codigo: '', nombre: '', descripcion: '', precio: 0, stock: 0 };
          this.closeModal();
          this.loadProductos();
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Error al crear producto:', err);
        this.ngZone.run(() => {
          this.message = 'No se pudo registrar el producto. Verifica tus permisos o si el código ya existe.';
          this.isError = true;
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  deleteProducto(id: number): void {
    if (!confirm(`¿Confirmas eliminar el producto #${id} del catálogo?`)) return;
    this.productosService.deleteProducto(id).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.message = `Producto #${id} eliminado.`;
          this.isError = false;
          this.loadProductos();
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Error al eliminar producto:', err);
        this.ngZone.run(() => {
          this.message = 'No se pudo eliminar el producto.';
          this.isError = true;
          this.cdr.detectChanges();
        });
      }
    });
  }
}
