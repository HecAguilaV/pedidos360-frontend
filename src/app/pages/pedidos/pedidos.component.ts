import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PedidosService } from '../../services/pedidos.service';
import { AuthService } from '../../services/auth.service';
import { Pedido } from '../../models/pedido.model';

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="header-row">
        <div>
          <h2>🛒 Gestión de Pedidos</h2>
          <p class="subtitle">Microservicio <code>pedidos-service:8081</code> | Scope: <code>pedidos.read</code></p>
        </div>
        <button class="btn btn-primary" (click)="toggleForm()">
          {{ showForm ? '✕ Cancelar' : '+ Nuevo Pedido' }}
        </button>
      </div>

      <div class="alert alert-info" *ngIf="message">
        {{ message }}
      </div>

      <!-- Formulario para crear pedido -->
      <div class="form-card" *ngIf="showForm">
        <h3>Registrar Nuevo Pedido</h3>
        <form (ngSubmit)="onSubmit()">
          <div class="form-grid">
            <div class="form-group">
              <label>Cliente</label>
              <input type="text" [(ngModel)]="newPedido.cliente" name="cliente" required placeholder="Nombre del cliente" />
            </div>
            <div class="form-group">
              <label>Total (USD)</label>
              <input type="number" step="0.01" [(ngModel)]="newPedido.total" name="total" required placeholder="0.00" />
            </div>
            <div class="form-group">
              <label>Estado Inicial</label>
              <select [(ngModel)]="newPedido.estado" name="estado">
                <option value="PENDIENTE">PENDIENTE</option>
                <option value="CONFIRMADO">CONFIRMADO</option>
                <option value="ENVIADO">ENVIADO</option>
                <option value="ENTREGADO">ENTREGADO</option>
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" [disabled]="loading">
              {{ loading ? 'Guardando...' : 'Crear Pedido' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Listado de Pedidos -->
      <div class="table-card">
        <div *ngIf="loading && pedidos.length === 0" class="loading-state">
          Cargando pedidos desde el microservicio...
        </div>

        <table class="data-table" *ngIf="pedidos.length > 0">
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let ped of pedidos">
              <td><strong>#{{ ped.id }}</strong></td>
              <td>{{ ped.fecha | date:'dd/MM/yyyy HH:mm' }}</td>
              <td><strong>{{ ped.cliente }}</strong></td>
              <td>
                <span class="status-badge" [ngClass]="ped.estado.toLowerCase()">
                  {{ ped.estado }}
                </span>
              </td>
              <td class="total-cell">\${{ ped.total | number:'1.2-2' }}</td>
              <td>
                <button
                  class="btn-delete"
                  (click)="deletePedido(ped.id!)"
                  [disabled]="!authService.isAdmin()"
                  [title]="authService.isAdmin() ? 'Eliminar pedido' : 'Requiere ROLE_ADMIN'"
                >
                  🗑️ Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="!loading && pedidos.length === 0" class="empty-state">
          No hay pedidos registrados en PostgreSQL. Registrá el primero arriba.
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
    }
    .form-group label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #475569;
    }
    .form-group input, .form-group select {
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
    .total-cell {
      font-weight: 700;
      color: #0f172a;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-badge.pendiente {
      background: #fef9c3;
      color: #854d0e;
    }
    .status-badge.confirmado {
      background: #e0f2fe;
      color: #0369a1;
    }
    .status-badge.enviado {
      background: #ede9fe;
      color: #6d28d9;
    }
    .status-badge.entregado {
      background: #dcfce7;
      color: #15803d;
    }
    .btn-delete {
      background: none;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.8rem;
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
export class PedidosComponent implements OnInit {
  pedidos: Pedido[] = [];
  showForm = false;
  loading = false;
  message = '';

  newPedido: Pedido = {
    cliente: '',
    estado: 'PENDIENTE',
    total: 0
  };

  constructor(
    private pedidosService: PedidosService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadPedidos();
  }

  loadPedidos(): void {
    this.loading = true;
    this.pedidosService.getPedidos().subscribe({
      next: (data) => {
        this.pedidos = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar pedidos:', err);
        this.message = 'No se pudo conectar con el microservicio pedidos-service (puerto 8081). ¿Está corriendo?';
        this.loading = false;
      }
    });
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
  }

  onSubmit(): void {
    this.loading = true;
    this.pedidosService.createPedido(this.newPedido).subscribe({
      next: (created) => {
        this.message = `Pedido #${created.id} creado exitosamente.`;
        this.newPedido = { cliente: '', estado: 'PENDIENTE', total: 0 };
        this.showForm = false;
        this.loadPedidos();
      },
      error: (err) => {
        console.error('Error al crear pedido:', err);
        this.message = 'Error al crear pedido. Verificá los permisos del token.';
        this.loading = false;
      }
    });
  }

  deletePedido(id: number): void {
    if (!confirm('¿Seguro que deseás eliminar este pedido?')) return;
    this.pedidosService.deletePedido(id).subscribe({
      next: () => {
        this.message = `Pedido #${id} eliminado.`;
        this.loadPedidos();
      },
      error: (err) => {
        console.error('Error al eliminar pedido:', err);
        this.message = 'Error al eliminar pedido (requiere ROLE_ADMIN).';
      }
    });
  }
}
