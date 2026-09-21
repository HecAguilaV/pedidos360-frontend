import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductosService } from '../../services/productos.service';
import { AuthService } from '../../services/auth.service';
import { Producto } from '../../models/producto.model';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="crm-page">
      <!-- Action Toolbar -->
      <div class="toolbar">
        <div class="toolbar-info">
          <h2>Catálogo de Productos</h2>
          <div class="tech-tags">
            <span class="tag tag-service"><i class="ph ph-hard-drive"></i> productos-service:8082</span>
            <span class="tag tag-scope"><i class="ph ph-key"></i> productos.read</span>
          </div>
        </div>

        <div class="toolbar-actions">
          <div class="search-box">
            <i class="ph ph-magnifying-glass"></i>
            <input type="text" [(ngModel)]="searchTerm" placeholder="Buscar producto..." />
          </div>

          <button class="btn btn-primary" (click)="openModal()">
            <i class="ph ph-plus"></i> Nuevo Producto
          </button>
        </div>
      </div>

      <!-- Notification Banner -->
      <div class="toast-banner" *ngIf="message" [class.error]="isError">
        <i class="ph" [class.ph-check-circle]="!isError" [class.ph-warning-circle]="isError"></i>
        <span>{{ message }}</span>
        <button class="btn-close" (click)="message = ''"><i class="ph ph-x"></i></button>
      </div>

      <!-- CRM Data Table Card -->
      <div class="table-card">
        <div class="table-header-meta">
          <div class="meta-title">
            <i class="ph ph-stack"></i>
            <span>{{ filteredProductos.length }} productos registrados en PostgreSQL</span>
          </div>
          <button class="btn-icon" (click)="loadProductos()" title="Actualizar datos">
            <i class="ph ph-arrows-clockwise" [class.spinning]="loading"></i>
          </button>
        </div>

        <div *ngIf="loading && productos.length === 0" class="loading-state">
          <i class="ph ph-spinner spinning"></i>
          <span>Consultando microservicio...</span>
        </div>

        <table class="crm-table" *ngIf="filteredProductos.length > 0">
          <thead>
            <tr>
              <th>ID</th>
              <th>PRODUCTO</th>
              <th>DESCRIPCIÓN</th>
              <th>PRECIO UNITARIO</th>
              <th>STOCK</th>
              <th class="text-right">ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let prod of filteredProductos">
              <td class="cell-id">#{{ prod.id }}</td>
              <td class="cell-name">
                <div class="prod-avatar"><i class="ph ph-cube"></i></div>
                <div>
                  <strong>{{ prod.nombre }}</strong>
                </div>
              </td>
              <td class="cell-desc">{{ prod.descripcion || 'Sin descripción adicional' }}</td>
              <td class="cell-price">\${{ prod.precio | number:'1.2-2' }}</td>
              <td>
                <span class="stock-badge" [class.low]="prod.stock < 10">
                  <i class="ph" [class.ph-check]="prod.stock >= 10" [class.ph-warning]="prod.stock < 10"></i>
                  {{ prod.stock }} disponibles
                </span>
              </td>
              <td class="text-right">
                <button
                  class="btn-action-delete"
                  (click)="deleteProducto(prod.id!)"
                  [disabled]="!authService.isAdmin()"
                  [title]="authService.isAdmin() ? 'Eliminar producto' : 'Requiere permisos ROLE_ADMIN'"
                >
                  <i class="ph ph-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="!loading && filteredProductos.length === 0" class="empty-state">
          <i class="ph ph-package"></i>
          <p>No se encontraron productos que coincidan con la búsqueda.</p>
        </div>
      </div>

      <!-- Slide-over / Modal for Creating Product -->
      <div class="modal-backdrop" *ngIf="showModal" (click)="closeModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title">
              <i class="ph ph-plus-circle"></i>
              <h3>Registrar Producto</h3>
            </div>
            <button class="btn-close" (click)="closeModal()"><i class="ph ph-x"></i></button>
          </div>

          <form (ngSubmit)="onSubmit()">
            <div class="modal-body">
              <div class="form-group">
                <label>Nombre del Producto *</label>
                <input type="text" [(ngModel)]="newProducto.nombre" name="nombre" required placeholder="Ej: Laptop Dell XPS 15" />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Precio Unitario (USD) *</label>
                  <input type="number" step="0.01" [(ngModel)]="newProducto.precio" name="precio" required placeholder="1299.99" />
                </div>
                <div class="form-group">
                  <label>Stock Inicial *</label>
                  <input type="number" [(ngModel)]="newProducto.stock" name="stock" required placeholder="25" />
                </div>
              </div>

              <div class="form-group">
                <label>Descripción</label>
                <textarea [(ngModel)]="newProducto.descripcion" name="descripcion" rows="3" placeholder="Características técnicas, especificaciones..."></textarea>
              </div>

              <div class="scope-hint">
                <i class="ph ph-info"></i>
                <span>Esta acción emitirá un <code>POST /api/v1/productos</code> con scope <code>productos.write</code></span>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancelar</button>
              <button type="submit" class="btn btn-primary" [disabled]="loading">
                <i class="ph ph-floppy-disk"></i> {{ loading ? 'Guardando...' : 'Crear Producto' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .crm-page { display: flex; flex-direction: column; gap: 24px; }
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .toolbar-info h2 {
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.4px;
      margin-bottom: 6px;
    }
    .tech-tags { display: flex; gap: 8px; }
    .tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 6px;
    }
    .tag-service { background: #eff6ff; color: #2563eb; }
    .tag-scope { background: #f1f5f9; color: #475569; }
    .toolbar-actions { display: flex; align-items: center; gap: 12px; }
    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 8px 14px;
      border-radius: 8px;
      width: 240px;
    }
    .search-box i { color: #94a3b8; font-size: 1.1rem; }
    .search-box input {
      border: none;
      outline: none;
      width: 100%;
      font-size: 0.85rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 16px;
      font-size: 0.85rem;
      font-weight: 600;
      border-radius: 8px;
      transition: all 0.2s;
    }
    .btn-primary { background: #2563eb; color: white; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-secondary { background: #f1f5f9; color: #334155; }
    .toast-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      border-radius: 8px;
      font-size: 0.9rem;
    }
    .toast-banner.error { background: #fef2f2; color: #991b1b; border-color: #fecaca; }
    .toast-banner i { font-size: 1.2rem; }
    .btn-close { margin-left: auto; color: inherit; font-size: 1.1rem; }
    .table-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: var(--shadow-sm);
    }
    .table-header-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 20px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }
    .meta-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      color: #64748b;
    }
    .btn-icon {
      color: #64748b;
      font-size: 1.1rem;
      padding: 4px;
      border-radius: 6px;
      display: flex;
    }
    .btn-icon:hover { color: #0f172a; }
    .crm-table { width: 100%; border-collapse: collapse; text-align: left; }
    .crm-table th {
      padding: 12px 20px;
      font-size: 0.72rem;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.6px;
      border-bottom: 1px solid #e2e8f0;
      background: #ffffff;
    }
    .crm-table td {
      padding: 14px 20px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.88rem;
    }
    .cell-id { font-weight: 700; color: #94a3b8; width: 80px; }
    .cell-name {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .prod-avatar {
      width: 34px;
      height: 34px;
      background: #eff6ff;
      color: #2563eb;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
    }
    .cell-desc { color: #64748b; max-width: 320px; }
    .cell-price { font-weight: 700; color: #0f172a; }
    .stock-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 0.78rem;
      font-weight: 600;
      background: #ecfdf5;
      color: #059669;
    }
    .stock-badge.low { background: #fef2f2; color: #dc2626; }
    .btn-action-delete {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      border: 1px solid #e2e8f0;
      transition: all 0.2s;
    }
    .btn-action-delete:hover:not(:disabled) {
      background: #fee2e2;
      color: #dc2626;
      border-color: #fca5a5;
    }
    .btn-action-delete:disabled { opacity: 0.4; cursor: not-allowed; }
    .text-right { text-align: right; }
    .spinning { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .empty-state, .loading-state {
      padding: 48px;
      text-align: center;
      color: #64748b;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      font-size: 0.95rem;
    }
    .empty-state i, .loading-state i { font-size: 2rem; color: #94a3b8; }
    /* Modal */
    .modal-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-card {
      width: 100%;
      max-width: 520px;
      background: white;
      border-radius: 14px;
      box-shadow: var(--shadow-lg);
      overflow: hidden;
      animation: modalSlide 0.2s ease-out;
    }
    @keyframes modalSlide {
      from { opacity: 0; transform: translateY(12px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .modal-header {
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
    }
    .modal-title { display: flex; align-items: center; gap: 10px; }
    .modal-title i { font-size: 1.4rem; color: #2563eb; }
    .modal-title h3 { margin: 0; font-size: 1.15rem; color: #0f172a; }
    .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 0.8rem; font-weight: 600; color: #475569; }
    .form-group input, .form-group textarea {
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      font-size: 0.9rem;
      outline: none;
    }
    .form-group input:focus, .form-group textarea:focus { border-color: #2563eb; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .scope-hint {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f8fafc;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.78rem;
      color: #64748b;
      border: 1px solid #e2e8f0;
    }
    .scope-hint code { background: #e2e8f0; padding: 1px 4px; border-radius: 4px; color: #0f172a; }
    .modal-footer {
      padding: 16px 24px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
  `]
})
export class ProductosComponent implements OnInit {
  productos: Producto[] = [];
  loading = false;
  showModal = false;
  searchTerm = '';
  message = '';
  isError = false;

  newProducto: Producto = {
    nombre: '',
    descripcion: '',
    precio: 0,
    stock: 0
  };

  constructor(
    private productosService: ProductosService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadProductos();
  }

  get filteredProductos(): Producto[] {
    if (!this.searchTerm.trim()) return this.productos;
    const term = this.searchTerm.toLowerCase();
    return this.productos.filter(p =>
      p.nombre.toLowerCase().includes(term) ||
      p.descripcion?.toLowerCase().includes(term)
    );
  }

  loadProductos(): void {
    this.loading = true;
    this.productosService.getProductos().subscribe({
      next: (data) => {
        this.productos = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar productos:', err);
        this.message = 'No se pudo conectar con el microservicio productos-service (puerto 8082).';
        this.isError = true;
        this.loading = false;
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
    this.loading = true;
    this.productosService.createProducto(this.newProducto).subscribe({
      next: (created) => {
        this.message = `Producto "${created.nombre}" creado exitosamente en PostgreSQL.`;
        this.isError = false;
        this.newProducto = { nombre: '', descripcion: '', precio: 0, stock: 0 };
        this.closeModal();
        this.loadProductos();
      },
      error: (err) => {
        console.error('Error al crear producto:', err);
        this.message = 'Error al crear producto. Verificá los permisos del token.';
        this.isError = true;
        this.loading = false;
      }
    });
  }

  deleteProducto(id: number): void {
    if (!confirm(`¿Eliminar producto #${id}? (Requiere ROLE_ADMIN)`)) return;
    this.productosService.deleteProducto(id).subscribe({
      next: () => {
        this.message = `Producto #${id} eliminado correctamente.`;
        this.isError = false;
        this.loadProductos();
      },
      error: (err) => {
        console.error('Error al eliminar producto:', err);
        this.message = 'Error: la eliminación requiere rol ADMIN.';
        this.isError = true;
      }
    });
  }
}
