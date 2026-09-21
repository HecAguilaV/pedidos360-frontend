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
    <div class="page-container">
      <div class="header-row">
        <div>
          <h2>📦 Catálogo de Productos</h2>
          <p class="subtitle">Microservicio <code>productos-service:8082</code> | Scope: <code>productos.read</code></p>
        </div>
        <button class="btn btn-primary" (click)="toggleForm()">
          {{ showForm ? '✕ Cancelar' : '+ Nuevo Producto' }}
        </button>
      </div>

      <div class="alert alert-info" *ngIf="message">
        {{ message }}
      </div>

      <!-- Formulario para crear producto -->
      <div class="form-card" *ngIf="showForm">
        <h3>Registrar Nuevo Producto</h3>
        <form (ngSubmit)="onSubmit()">
          <div class="form-grid">
            <div class="form-group">
              <label>Nombre</label>
              <input type="text" [(ngModel)]="newProducto.nombre" name="nombre" required placeholder="Ej: Auriculares Bluetooth" />
            </div>
            <div class="form-group">
              <label>Precio (USD)</label>
              <input type="number" step="0.01" [(ngModel)]="newProducto.precio" name="precio" required placeholder="0.00" />
            </div>
            <div class="form-group">
              <label>Stock</label>
              <input type="number" [(ngModel)]="newProducto.stock" name="stock" required placeholder="10" />
            </div>
          </div>
          <div class="form-group">
            <label>Descripción</label>
            <textarea [(ngModel)]="newProducto.descripcion" name="descripcion" rows="2" placeholder="Detalles del producto..."></textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" [disabled]="loading">
              {{ loading ? 'Guardando...' : 'Guardar Producto' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Listado de Productos -->
      <div class="table-card">
        <div *ngIf="loading && productos.length === 0" class="loading-state">
          Cargando productos desde el microservicio...
        </div>

        <table class="data-table" *ngIf="productos.length > 0">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let prod of productos">
              <td><strong>#{{ prod.id }}</strong></td>
              <td>{{ prod.nombre }}</td>
              <td class="desc-cell">{{ prod.descripcion }}</td>
              <td class="price-cell">\${{ prod.precio | number:'1.2-2' }}</td>
              <td>
                <span class="stock-badge" [class.low]="prod.stock < 10">{{ prod.stock }} un.</span>
              </td>
              <td>
                <button
                  class="btn-delete"
                  (click)="deleteProducto(prod.id!)"
                  [disabled]="!authService.isAdmin()"
                  [title]="authService.isAdmin() ? 'Eliminar producto' : 'Requiere ROLE_ADMIN'"
                >
                  🗑️ Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="!loading && productos.length === 0" class="empty-state">
          No hay productos registrados en PostgreSQL. Creá el primero arriba.
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-row h2 {
      margin: 0 0 6px 0;
      color: #0f172a;
    }
    .subtitle {
      margin: 0;
      color: #64748b;
      font-size: 0.9rem;
    }
    .subtitle code {
      background: #e2e8f0;
      padding: 2px 6px;
      border-radius: 4px;
      color: #0f172a;
    }
    .btn {
      padding: 10px 18px;
      font-weight: 600;
      border-radius: 8px;
      border: none;
      cursor: pointer;
    }
    .btn-primary {
      background: #2563eb;
      color: white;
    }
    .btn-primary:hover {
      background: #1d4ed8;
    }
    .alert {
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 0.9rem;
    }
    .alert-info {
      background: #eff6ff;
      color: #1e40af;
      border: 1px solid #bfdbfe;
    }
    .form-card {
      background: white;
      padding: 24px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.04);
    }
    .form-card h3 {
      margin: 0 0 16px 0;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 12px;
    }
    .form-group label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #475569;
    }
    .form-group input, .form-group textarea {
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      font-size: 0.95rem;
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
    }
    .table-card {
      background: white;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.04);
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .data-table th {
      background: #f8fafc;
      padding: 14px 18px;
      font-size: 0.85rem;
      font-weight: 600;
      color: #475569;
      border-bottom: 1px solid #e2e8f0;
    }
    .data-table td {
      padding: 14px 18px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.9rem;
      color: #1e293b;
    }
    .desc-cell {
      max-width: 320px;
      color: #64748b !important;
    }
    .price-cell {
      font-weight: 600;
      color: #059669 !important;
    }
    .stock-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
      background: #f1f5f9;
      color: #334155;
    }
    .stock-badge.low {
      background: #fef2f2;
      color: #dc2626;
    }
    .btn-delete {
      background: none;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s;
    }
    .btn-delete:hover:not(:disabled) {
      background: #fee2e2;
    }
    .btn-delete:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      border-color: #cbd5e1;
      color: #94a3b8;
    }
    .loading-state, .empty-state {
      padding: 40px;
      text-align: center;
      color: #64748b;
    }
  `]
})
export class ProductosComponent implements OnInit {
  productos: Producto[] = [];
  showForm = false;
  loading = false;
  message = '';

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

  loadProductos(): void {
    this.loading = true;
    this.productosService.getProductos().subscribe({
      next: (data) => {
        this.productos = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar productos:', err);
        this.message = 'No se pudo conectar con el microservicio productos-service (puerto 8082). ¿Está corriendo?';
        this.loading = false;
      }
    });
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
  }

  onSubmit(): void {
    this.loading = true;
    this.productosService.createProducto(this.newProducto).subscribe({
      next: (created) => {
        this.message = `Producto "${created.nombre}" creado exitosamente.`;
        this.newProducto = { nombre: '', descripcion: '', precio: 0, stock: 0 };
        this.showForm = false;
        this.loadProductos();
      },
      error: (err) => {
        console.error('Error al crear producto:', err);
        this.message = 'Error al crear producto. Verificá los permisos del token.';
        this.loading = false;
      }
    });
  }

  deleteProducto(id: number): void {
    if (!confirm('¿Seguro que deseás eliminar este producto?')) return;
    this.productosService.deleteProducto(id).subscribe({
      next: () => {
        this.message = `Producto #${id} eliminado.`;
        this.loadProductos();
      },
      error: (err) => {
        console.error('Error al eliminar producto:', err);
        this.message = 'Error al eliminar producto (requiere ROLE_ADMIN).';
      }
    });
  }
}
