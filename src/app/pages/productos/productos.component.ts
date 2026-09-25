import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductosService } from '../../services/productos.service';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { Producto } from '../../models/producto.model';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="catalog-page">
      <!-- Header y Contexto de Negocio -->
      <section class="catalog-hero">
        <div class="hero-top-row">
          <div class="hero-badge">
            <i class="ph ph-hard-drives"></i>
            <span>CATÁLOGO ENTERPRISE · HARDWARE & INFRAESTRUCTURA CLOUD</span>
          </div>
          <div class="tech-indicator">
            <span class="pulse-green"></span>
            <code>productos-service:8082</code> (PostgreSQL Cloud)
          </div>
        </div>

        <div class="hero-main-row">
          <div>
            <h1 class="hero-title">Equipamiento & Cómputo Corporativo</h1>
            <p class="hero-subtitle">
              Suministro certificado de servidores, switches de alta densidad y almacenamiento para centros de datos.
            </p>
          </div>

          <div class="hero-actions" *ngIf="authService.isAdmin()">
            <button class="btn-create-product" (click)="openModal()">
              <i class="ph ph-plus-circle"></i>
              <span>Registrar Nuevo Equipo</span>
            </button>
          </div>
        </div>

        <!-- Categorías / Filtros Rápidos -->
        <div class="category-tabs-bar">
          <div class="tabs-scroll">
            <button 
              class="tab-btn" 
              [class.active]="selectedCategory === 'TODOS'" 
              (click)="selectedCategory = 'TODOS'">
              <i class="ph ph-squares-four"></i>
              <span>Todos los Equipos</span>
              <span class="tab-count">{{ productos.length }}</span>
            </button>
            <button 
              class="tab-btn" 
              [class.active]="selectedCategory === 'SERVIDORES'" 
              (click)="selectedCategory = 'SERVIDORES'">
              <i class="ph ph-cpu"></i>
              <span>Servidores & Cómputo</span>
            </button>
            <button 
              class="tab-btn" 
              [class.active]="selectedCategory === 'NETWORKING'" 
              (click)="selectedCategory = 'NETWORKING'">
              <i class="ph ph-broadcast"></i>
              <span>Networking & Switches</span>
            </button>
            <button 
              class="tab-btn" 
              [class.active]="selectedCategory === 'ALMACENAMIENTO'" 
              (click)="selectedCategory = 'ALMACENAMIENTO'">
              <i class="ph ph-database"></i>
              <span>Storage SAN / NVMe</span>
            </button>
            <button 
              class="tab-btn" 
              [class.active]="selectedCategory === 'GPU_AI'" 
              (click)="selectedCategory = 'GPU_AI'">
              <i class="ph ph-sparkle"></i>
              <span>Aceleradores IA & GPUs</span>
            </button>
          </div>
        </div>
      </section>

      <!-- Barra de Filtros, Búsqueda y Switch de Vista -->
      <section class="toolbar-section">
        <div class="search-input-wrapper">
          <i class="ph ph-magnifying-glass"></i>
          <input 
            type="text" 
            [(ngModel)]="searchTerm" 
            placeholder="Buscar por modelo, SKU o especificación técnica..." 
          />
          <button *ngIf="searchTerm" (click)="searchTerm = ''" class="btn-clear-search">
            <i class="ph ph-x"></i>
          </button>
        </div>

        <div class="toolbar-right-controls">
          <label class="toggle-stock-label">
            <input type="checkbox" [(ngModel)]="onlyInStock" />
            <span>Solo con stock disponible</span>
          </label>

          <div class="view-switcher">
            <button 
              class="view-btn" 
              [class.active]="viewMode === 'grid'" 
              (click)="viewMode = 'grid'" 
              title="Vista en Tarjetas">
              <i class="ph ph-grid-four"></i>
            </button>
            <button 
              class="view-btn" 
              [class.active]="viewMode === 'table'" 
              (click)="viewMode = 'table'" 
              title="Vista de Adquisiciones (Tabla)">
              <i class="ph ph-list-dashes"></i>
            </button>
          </div>
        </div>
      </section>

      <!-- Toast de Notificaciones -->
      <div class="feedback-banner" *ngIf="message" [class.error]="isError">
        <div class="feedback-content">
          <i class="ph" [class.ph-check-circle]="!isError" [class.ph-warning-circle]="isError"></i>
          <span>{{ message }}</span>
        </div>
        <button class="btn-close-toast" (click)="message = ''"><i class="ph ph-x"></i></button>
      </div>

      <!-- Estado de Carga -->
      <div *ngIf="loading && productos.length === 0" class="catalog-loading-state">
        <i class="ph ph-spinner ph-spin"></i>
        <span>Consultando inventario en PostgreSQL Cloud...</span>
      </div>

      <!-- VISTA 1: GRID DE PRODUCTOS (CARDS E-COMMERCE) -->
      <section class="products-grid-section" *ngIf="!loading && viewMode === 'grid' && filteredProductos.length > 0">
        <article class="product-card" *ngFor="let prod of filteredProductos">
          <!-- Card Header / Meta -->
          <div class="card-top-bar">
            <span class="card-sku">{{ prod.codigo || ('SKU-P360-' + (prod.id | number:'3.0-0')) }}</span>
            <span class="card-category-badge">{{ inferCategory(prod) }}</span>
          </div>

          <!-- Icon / Visual Anchor -->
          <div class="product-visual-anchor">
            <div class="anchor-icon">
              <i class="ph" [ngClass]="getCategoryIcon(prod)"></i>
            </div>
          </div>

          <!-- Información del Producto -->
          <div class="card-body">
            <h3 class="product-name" [title]="prod.nombre">{{ prod.nombre }}</h3>
            <p class="product-desc">{{ prod.descripcion || 'Configuración estándar para despliegues empresariales de alta concurrencia.' }}</p>
          </div>

          <!-- Estado de Stock Reactivo -->
          <div class="card-stock-row">
            <div class="stock-status-pill" [ngClass]="getStockStatusClass(prod.stock)">
              <span class="stock-indicator-dot"></span>
              <span>{{ getStockStatusText(prod.stock) }}</span>
            </div>
          </div>

          <!-- Card Footer con Precio y Acción al Carrito -->
          <div class="card-footer">
            <div class="price-block">
              <span class="price-currency">USD</span>
              <span class="price-value">\${{ prod.precio | number:'1.2-2' }}</span>
              <span class="price-tax">+ IVA Recuperable</span>
            </div>

            <div class="card-actions-row">
              <div class="card-quantity" *ngIf="prod.stock > 0">
                <button (click)="decrementQty(prod.id!)">-</button>
                <span>{{ getQty(prod.id!) }}</span>
                <button (click)="incrementQty(prod.id!, prod.stock)">+</button>
              </div>

              <button 
                class="btn-add-cart" 
                [disabled]="prod.stock <= 0" 
                (click)="agregarAlCarrito(prod)">
                <i class="ph" [ngClass]="addedState[prod.id!] ? 'ph-check-circle' : 'ph-shopping-cart-simple'"></i>
                <span>{{ addedState[prod.id!] ? '¡Agregado!' : (prod.stock > 0 ? 'Agregar' : 'Agotado') }}</span>
              </button>
            </div>
          </div>

          <!-- Opciones de Administrador (Solo ADMIN) -->
          <div class="admin-card-overlay" *ngIf="authService.isAdmin()">
            <button 
              class="btn-admin-delete" 
              (click)="deleteProducto(prod.id!)" 
              title="Eliminar producto de la base de datos (ROLE_ADMIN)">
              <i class="ph ph-trash"></i>
            </button>
          </div>
        </article>
      </section>

      <!-- VISTA 2: TABLA DE ADQUISICIONES (BOM PROCUREMENT VIEW) -->
      <section class="products-table-section" *ngIf="!loading && viewMode === 'table' && filteredProductos.length > 0">
        <div class="table-container-card">
          <table class="enterprise-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>EQUIPO / ESPECIFICACIÓN</th>
                <th>CATEGORÍA</th>
                <th>PRECIO UNITARIO</th>
                <th>STOCK DISPONIBLE</th>
                <th>CANTIDAD</th>
                <th class="text-right">ADQUISICIÓN</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let prod of filteredProductos">
                <td class="sku-cell">{{ prod.codigo || ('SKU-P360-' + (prod.id | number:'3.0-0')) }}</td>
                <td class="name-cell">
                  <div class="table-prod-info">
                    <strong>{{ prod.nombre }}</strong>
                    <small>{{ prod.descripcion }}</small>
                  </div>
                </td>
                <td>
                  <span class="table-category-tag">{{ inferCategory(prod) }}</span>
                </td>
                <td class="price-cell">\${{ prod.precio | number:'1.2-2' }}</td>
                <td>
                  <span class="stock-status-pill small" [ngClass]="getStockStatusClass(prod.stock)">
                    <span class="stock-indicator-dot"></span>
                    <span>{{ prod.stock }} unid.</span>
                  </span>
                </td>
                <td>
                  <div class="card-quantity table-compact" *ngIf="prod.stock > 0">
                    <button (click)="decrementQty(prod.id!)">-</button>
                    <span>{{ getQty(prod.id!) }}</span>
                    <button (click)="incrementQty(prod.id!, prod.stock)">+</button>
                  </div>
                </td>
                <td class="text-right">
                  <div class="table-actions-inline">
                    <button 
                      class="btn-table-add" 
                      [disabled]="prod.stock <= 0" 
                      (click)="agregarAlCarrito(prod)">
                      <i class="ph" [ngClass]="addedState[prod.id!] ? 'ph-check-circle' : 'ph-plus-circle'"></i>
                      <span>{{ addedState[prod.id!] ? 'Listo' : 'Agregar' }}</span>
                    </button>
                    <button 
                      *ngIf="authService.isAdmin()" 
                      class="btn-table-delete" 
                      (click)="deleteProducto(prod.id!)"
                      title="Eliminar">
                      <i class="ph ph-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Estado Vacío -->
      <div *ngIf="!loading && filteredProductos.length === 0" class="catalog-empty-state">
        <div class="empty-icon-circle">
          <i class="ph ph-magnifying-glass"></i>
        </div>
        <h3>No se encontraron equipos con los criterios seleccionados</h3>
        <p>Probá modificando los términos de búsqueda o cambiando la categoría seleccionada.</p>
        <button class="btn-reset-filters" (click)="resetFilters()">Ver todo el catálogo</button>
      </div>

      <!-- MODAL CORPORATIVO: REGISTRAR NUEVO EQUIPO (SOLO ADMIN) -->
      <div class="modal-backdrop" *ngIf="showModal" (click)="closeModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-box">
              <div class="modal-icon-badge">
                <i class="ph ph-plus-circle"></i>
              </div>
              <div>
                <h3>Registrar Nuevo Equipo en Catálogo</h3>
                <p>Publicación directa en PostgreSQL mediante el microservicio <code>productos-service</code></p>
              </div>
            </div>
            <button class="btn-modal-close" (click)="closeModal()"><i class="ph ph-x"></i></button>
          </div>

          <form (ngSubmit)="onSubmit()">
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label>Código SKU / Referencia *</label>
                  <input type="text" [(ngModel)]="newProducto.codigo" name="codigo" placeholder="Ej: SVR-R750-XS" required />
                </div>
                <div class="form-group">
                  <label>Categoría</label>
                  <select [(ngModel)]="formCategory" name="formCategory">
                    <option value="SERVIDORES">Servidores & Cómputo</option>
                    <option value="NETWORKING">Networking & Switches</option>
                    <option value="ALMACENAMIENTO">Storage SAN / NVMe</option>
                    <option value="GPU_AI">Aceleradores IA & GPUs</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>Nombre del Equipo / Solución *</label>
                <input type="text" [(ngModel)]="newProducto.nombre" name="nombre" placeholder="Ej: Servidor Rack Dell PowerEdge R750xs Dual Xeon" required />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Precio Unitario (USD) *</label>
                  <input type="number" step="0.01" [(ngModel)]="newProducto.precio" name="precio" placeholder="2499.00" required />
                </div>
                <div class="form-group">
                  <label>Stock Inicial en Bodega *</label>
                  <input type="number" [(ngModel)]="newProducto.stock" name="stock" placeholder="15" required />
                </div>
              </div>

              <div class="form-group">
                <label>Especificaciones Técnicas / Descripción</label>
                <textarea 
                  [(ngModel)]="newProducto.descripcion" 
                  name="descripcion" 
                  rows="3" 
                  placeholder="Detalles de hardware: procesador, RAM, bahías de disco, puertos de red..."></textarea>
              </div>

              <div class="cloud-spec-note">
                <i class="ph ph-shield-check"></i>
                <span>Requiere token JWT de Azure Entra ID con scope <code>productos.write</code></span>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-cancel" (click)="closeModal()">Cancelar</button>
              <button type="submit" class="btn-submit" [disabled]="loading">
                <i class="ph" [ngClass]="loading ? 'ph-spinner ph-spin' : 'ph-floppy-disk'"></i>
                <span>{{ loading ? 'Guardando en BD...' : 'Publicar Producto' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* -----------------------------------------------------------------------
       Página del Catálogo y Contenedor Principal
       ----------------------------------------------------------------------- */
    .catalog-page {
      max-width: 1400px;
      margin: 0 auto;
      padding: 32px 24px 64px 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* -----------------------------------------------------------------------
       Hero Banner Corporativo
       ----------------------------------------------------------------------- */
    .catalog-hero {
      background: var(--surface-white);
      border: 1px solid var(--corp-200);
      border-radius: var(--radius-lg);
      padding: 28px 32px 20px 32px;
      box-shadow: var(--shadow-subtle);
    }

    .hero-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.72rem;
      font-weight: 800;
      color: var(--corp-600);
      letter-spacing: 0.6px;
    }

    .hero-badge i {
      color: var(--brand-blue);
      font-size: 1.1rem;
    }

    .tech-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.75rem;
      color: var(--corp-500);
      background: var(--corp-50);
      padding: 4px 10px;
      border-radius: var(--radius-full);
      border: 1px solid var(--corp-200);
    }

    .pulse-green {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--commerce-emerald);
      box-shadow: 0 0 6px var(--commerce-emerald);
    }

    .tech-indicator code {
      font-family: var(--font-mono);
      color: var(--corp-800);
      font-weight: 700;
    }

    .hero-main-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--corp-100);
    }

    .hero-title {
      font-size: 1.85rem;
      font-weight: 800;
      color: var(--corp-900);
      letter-spacing: -0.6px;
      line-height: 1.2;
      margin-bottom: 6px;
    }

    .hero-subtitle {
      font-size: 0.95rem;
      color: var(--corp-500);
      max-width: 680px;
      line-height: 1.5;
    }

    .btn-create-product {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--corp-900);
      color: var(--surface-white);
      padding: 10px 18px;
      border-radius: var(--radius-md);
      font-size: 0.88rem;
      font-weight: 700;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
      flex-shrink: 0;
    }

    .btn-create-product:hover {
      background: var(--corp-800);
      transform: translateY(-1px);
    }

    /* Category Tabs */
    .category-tabs-bar {
      margin-top: 16px;
    }

    .tabs-scroll {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 4px;
    }

    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: var(--radius-full);
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--corp-600);
      background: var(--corp-50);
      border: 1px solid var(--corp-200);
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .tab-btn i {
      font-size: 1.05rem;
      color: var(--corp-400);
    }

    .tab-btn:hover {
      background: var(--corp-100);
      color: var(--corp-900);
    }

    .tab-btn.active {
      background: var(--brand-blue-subtle);
      border-color: var(--brand-blue);
      color: var(--brand-blue);
      font-weight: 700;
    }

    .tab-btn.active i {
      color: var(--brand-blue);
    }

    .tab-count {
      font-size: 0.72rem;
      background: rgba(15, 23, 42, 0.08);
      padding: 1px 6px;
      border-radius: var(--radius-full);
      font-weight: 700;
    }

    /* -----------------------------------------------------------------------
       Toolbar de Búsqueda y Filtros
       ----------------------------------------------------------------------- */
    .toolbar-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .search-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      background: var(--surface-white);
      border: 1px solid var(--corp-200);
      border-radius: var(--radius-md);
      padding: 8px 14px;
      width: 100%;
      max-width: 440px;
      box-shadow: var(--shadow-subtle);
    }

    .search-input-wrapper i {
      color: var(--corp-400);
      font-size: 1.15rem;
      margin-right: 10px;
    }

    .search-input-wrapper input {
      border: none;
      outline: none;
      width: 100%;
      font-size: 0.9rem;
      color: var(--corp-900);
    }

    .btn-clear-search {
      color: var(--corp-400);
      padding: 2px;
      font-size: 1rem;
    }

    .toolbar-right-controls {
      display: flex;
      align-items: center;
      gap: 18px;
    }

    .toggle-stock-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--corp-600);
      cursor: pointer;
      user-select: none;
    }

    .toggle-stock-label input[type="checkbox"] {
      width: 16px;
      height: 16px;
      accent-color: var(--brand-blue);
      cursor: pointer;
    }

    .view-switcher {
      display: flex;
      background: var(--corp-100);
      padding: 3px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--corp-200);
    }

    .view-btn {
      width: 32px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm);
      color: var(--corp-500);
      font-size: 1.1rem;
      transition: all 0.15s;
    }

    .view-btn.active {
      background: var(--surface-white);
      color: var(--corp-900);
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
    }

    /* -----------------------------------------------------------------------
       Toast Banner de Notificación
       ----------------------------------------------------------------------- */
    .feedback-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 18px;
      background: var(--commerce-emerald-subtle);
      border: 1px solid rgba(5, 150, 105, 0.25);
      border-radius: var(--radius-md);
      color: #065f46;
      font-size: 0.88rem;
    }

    .feedback-banner.error {
      background: var(--status-danger-subtle);
      border-color: rgba(220, 38, 38, 0.25);
      color: #991b1b;
    }

    .feedback-content {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
    }

    .feedback-content i {
      font-size: 1.25rem;
    }

    .btn-close-toast {
      color: inherit;
      font-size: 1.1rem;
    }

    /* -----------------------------------------------------------------------
       Grid de Cards E-Commerce
       ----------------------------------------------------------------------- */
    .products-grid-section {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 24px;
    }

    .product-card {
      background: var(--surface-white);
      border: 1px solid var(--corp-200);
      border-radius: var(--radius-lg);
      padding: 24px;
      display: flex;
      flex-direction: column;
      position: relative;
      box-shadow: var(--shadow-subtle);
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    }

    .product-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-hover);
      border-color: var(--corp-300);
    }

    .card-top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .card-sku {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--corp-500);
      letter-spacing: 0.5px;
    }

    .card-category-badge {
      font-size: 0.68rem;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: var(--radius-full);
      background: var(--corp-100);
      color: var(--corp-700);
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .product-visual-anchor {
      margin-bottom: 16px;
    }

    .anchor-icon {
      width: 52px;
      height: 52px;
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, var(--corp-100) 0%, var(--corp-50) 100%);
      border: 1px solid var(--corp-200);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      color: var(--brand-blue);
    }

    .card-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }

    .product-name {
      font-size: 1.1rem;
      font-weight: 800;
      color: var(--corp-900);
      letter-spacing: -0.3px;
      line-height: 1.3;
    }

    .product-desc {
      font-size: 0.85rem;
      color: var(--corp-500);
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-stock-row {
      margin-bottom: 20px;
    }

    .stock-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: 0.75rem;
      font-weight: 700;
    }

    .stock-status-pill.in-stock {
      background: var(--commerce-emerald-subtle);
      color: var(--commerce-emerald);
    }

    .stock-status-pill.low-stock {
      background: var(--status-warning-subtle);
      color: var(--status-warning);
    }

    .stock-status-pill.out-of-stock {
      background: var(--status-danger-subtle);
      color: var(--status-danger);
    }

    .stock-indicator-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .card-footer {
      border-top: 1px solid var(--corp-100);
      padding-top: 18px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 12px;
    }

    .price-block {
      display: flex;
      flex-direction: column;
    }

    .price-currency {
      font-size: 0.65rem;
      font-weight: 800;
      color: var(--corp-400);
    }

    .price-value {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--corp-900);
      letter-spacing: -0.4px;
      font-feature-settings: 'tnum';
    }

    .price-tax {
      font-size: 0.68rem;
      color: var(--corp-400);
      font-weight: 500;
    }

    .card-actions-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .card-quantity {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--corp-200);
      border-radius: var(--radius-sm);
      background: var(--corp-50);
    }

    .card-quantity button {
      width: 26px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.82rem;
      color: var(--corp-700);
      transition: background 0.15s;
    }

    .card-quantity button:hover {
      background: var(--corp-200);
    }

    .card-quantity span {
      width: 24px;
      text-align: center;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--corp-900);
    }

    .btn-add-cart {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 16px;
      background: var(--brand-blue);
      color: var(--surface-white);
      border-radius: var(--radius-md);
      font-size: 0.85rem;
      font-weight: 700;
      transition: all 0.15s ease;
      box-shadow: 0 2px 6px rgba(29, 78, 216, 0.2);
    }

    .btn-add-cart:hover:not(:disabled) {
      background: var(--brand-blue-hover);
      transform: translateY(-1px);
    }

    .btn-add-cart:disabled {
      background: var(--corp-200);
      color: var(--corp-400);
      cursor: not-allowed;
      box-shadow: none;
    }

    /* Admin Action Overlay */
    .admin-card-overlay {
      position: absolute;
      top: 16px;
      right: 16px;
    }

    .btn-admin-delete {
      width: 28px;
      height: 28px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--corp-400);
      transition: all 0.15s;
    }

    .btn-admin-delete:hover {
      color: var(--status-danger);
      background: var(--status-danger-subtle);
    }

    /* -----------------------------------------------------------------------
       Vista 2: Tabla de Adquisiciones (BOM Table)
       ----------------------------------------------------------------------- */
    .products-table-section {
      width: 100%;
    }

    .table-container-card {
      background: var(--surface-white);
      border: 1px solid var(--corp-200);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: var(--shadow-subtle);
    }

    .enterprise-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .enterprise-table th {
      padding: 14px 20px;
      font-size: 0.72rem;
      font-weight: 800;
      color: var(--corp-500);
      letter-spacing: 0.6px;
      background: var(--corp-50);
      border-bottom: 1px solid var(--corp-200);
    }

    .enterprise-table td {
      padding: 16px 20px;
      border-bottom: 1px solid var(--corp-100);
      font-size: 0.88rem;
      vertical-align: middle;
    }

    .sku-cell {
      font-family: var(--font-mono);
      font-weight: 700;
      color: var(--corp-500);
      font-size: 0.8rem;
    }

    .name-cell strong {
      display: block;
      color: var(--corp-900);
      font-size: 0.92rem;
    }

    .name-cell small {
      color: var(--corp-500);
      font-size: 0.78rem;
      display: block;
      margin-top: 2px;
    }

    .table-category-tag {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 2px 8px;
      background: var(--corp-100);
      color: var(--corp-700);
      border-radius: var(--radius-full);
    }

    .price-cell {
      font-weight: 800;
      color: var(--corp-900);
      font-size: 0.95rem;
    }

    .stock-status-pill.small {
      padding: 2px 8px;
      font-size: 0.72rem;
    }

    .card-quantity.table-compact button {
      width: 22px;
      height: 24px;
    }

    .card-quantity.table-compact span {
      width: 20px;
    }

    .table-actions-inline {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
    }

    .btn-table-add {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: var(--brand-blue);
      color: var(--surface-white);
      border-radius: var(--radius-sm);
      font-size: 0.8rem;
      font-weight: 700;
      transition: background 0.15s;
    }

    .btn-table-add:hover:not(:disabled) {
      background: var(--brand-blue-hover);
    }

    .btn-table-add:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-table-delete {
      width: 28px;
      height: 28px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--corp-400);
    }

    .btn-table-delete:hover {
      color: var(--status-danger);
      background: var(--status-danger-subtle);
    }

    .text-right {
      text-align: right;
    }

    /* -----------------------------------------------------------------------
       Empty & Loading States
       ----------------------------------------------------------------------- */
    .catalog-loading-state, .catalog-empty-state {
      padding: 60px 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: var(--corp-500);
    }

    .catalog-loading-state i {
      font-size: 2.2rem;
      color: var(--brand-blue);
    }

    .empty-icon-circle {
      width: 64px;
      height: 64px;
      border-radius: var(--radius-full);
      background: var(--corp-100);
      color: var(--corp-400);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
    }

    .catalog-empty-state h3 {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--corp-800);
    }

    .catalog-empty-state p {
      font-size: 0.88rem;
      max-width: 420px;
    }

    .btn-reset-filters {
      margin-top: 8px;
      padding: 8px 18px;
      background: var(--corp-900);
      color: var(--surface-white);
      border-radius: var(--radius-md);
      font-size: 0.85rem;
      font-weight: 600;
    }

    /* -----------------------------------------------------------------------
       Modal de Registro de Producto (Admin)
       ----------------------------------------------------------------------- */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal-card {
      width: 100%;
      max-width: 540px;
      background: var(--surface-white);
      border-radius: var(--radius-lg);
      box-shadow: 0 20px 40px -8px rgba(15, 23, 42, 0.25);
      overflow: hidden;
    }

    .modal-header {
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid var(--corp-200);
    }

    .modal-title-box {
      display: flex;
      gap: 12px;
    }

    .modal-icon-badge {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      background: var(--brand-blue-subtle);
      color: var(--brand-blue);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      flex-shrink: 0;
    }

    .modal-title-box h3 {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--corp-900);
      margin: 0;
    }

    .modal-title-box p {
      font-size: 0.78rem;
      color: var(--corp-500);
      margin-top: 2px;
    }

    .btn-modal-close {
      color: var(--corp-400);
      font-size: 1.25rem;
    }

    .modal-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-group label {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--corp-700);
    }

    .form-group input, .form-group select, .form-group textarea {
      padding: 10px 14px;
      border-radius: var(--radius-md);
      border: 1px solid var(--corp-200);
      font-size: 0.9rem;
      color: var(--corp-900);
      outline: none;
      transition: border-color 0.15s;
    }

    .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
      border-color: var(--brand-blue);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .cloud-spec-note {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--corp-50);
      border: 1px solid var(--corp-200);
      padding: 10px 14px;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      color: var(--corp-600);
    }

    .cloud-spec-note i {
      color: var(--brand-blue);
      font-size: 1rem;
    }

    .cloud-spec-note code {
      font-family: var(--font-mono);
      color: var(--corp-900);
      background: var(--corp-100);
      padding: 1px 4px;
      border-radius: 3px;
    }

    .modal-footer {
      padding: 16px 24px;
      background: var(--corp-50);
      border-top: 1px solid var(--corp-200);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .btn-cancel {
      padding: 10px 16px;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--corp-600);
    }

    .btn-submit {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: var(--brand-blue);
      color: var(--surface-white);
      border-radius: var(--radius-md);
      font-size: 0.88rem;
      font-weight: 700;
      transition: background 0.15s;
    }

    .btn-submit:hover:not(:disabled) {
      background: var(--brand-blue-hover);
    }

    .btn-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `]
})
export class ProductosComponent implements OnInit {
  productos: Producto[] = [];
  loading = false;
  showModal = false;
  searchTerm = '';
  selectedCategory = 'TODOS';
  onlyInStock = false;
  viewMode: 'grid' | 'table' = 'grid';

  message = '';
  isError = false;

  // Mapa local para feedback de agregado al carrito
  addedState: { [id: number]: boolean } = {};
  quantities: { [id: number]: number } = {};

  formCategory = 'SERVIDORES';
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
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    this.loadProductos();
  }

  get filteredProductos(): Producto[] {
    return this.productos.filter(p => {
      // Filtro de Categoría
      if (this.selectedCategory !== 'TODOS') {
        const cat = this.inferCategory(p);
        if (cat !== this.selectedCategory) return false;
      }

      // Filtro de Solo Stock
      if (this.onlyInStock && p.stock <= 0) {
        return false;
      }

      // Filtro de Búsqueda
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
    const sku = prod.codigo || ('SKU-P360-' + prod.id);

    this.cartService.agregarItem(sku, prod.nombre, prod.precio, qty).subscribe({
      next: () => {
        this.addedState[prod.id!] = true;
        setTimeout(() => {
          this.addedState[prod.id!] = false;
        }, 1800);
      }
    });
  }

  inferCategory(prod: Producto): string {
    const text = (prod.nombre + ' ' + (prod.descripcion || '')).toLowerCase();
    if (text.includes('servidor') || text.includes('server') || text.includes('xeon') || text.includes('epyc') || text.includes('rack') || text.includes('blade')) {
      return 'SERVIDORES';
    }
    if (text.includes('switch') || text.includes('router') || text.includes('cisco') || text.includes('fibra') || text.includes('sfp') || text.includes('red')) {
      return 'NETWORKING';
    }
    if (text.includes('storage') || text.includes('disco') || text.includes('ssd') || text.includes('nvme') || text.includes('san') || text.includes('nas')) {
      return 'ALMACENAMIENTO';
    }
    if (text.includes('gpu') || text.includes('nvidia') || text.includes('tesla') || text.includes('ia') || text.includes('h100') || text.includes('a100')) {
      return 'GPU_AI';
    }
    return 'SERVIDORES';
  }

  getCategoryIcon(prod: Producto): string {
    const cat = this.inferCategory(prod);
    switch (cat) {
      case 'SERVIDORES': return 'ph-cpu';
      case 'NETWORKING': return 'ph-broadcast';
      case 'ALMACENAMIENTO': return 'ph-database';
      case 'GPU_AI': return 'ph-sparkle';
      default: return 'ph-hard-drive';
    }
  }

  getStockStatusClass(stock: number): string {
    if (stock >= 10) return 'in-stock';
    if (stock > 0) return 'low-stock';
    return 'out-of-stock';
  }

  getStockStatusText(stock: number): string {
    if (stock >= 10) return `En Stock (${stock} disp.)`;
    if (stock > 0) return `Últimas ${stock} unid.`;
    return 'Sin Stock Inmediato';
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = 'TODOS';
    this.onlyInStock = false;
  }

  openModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  onSubmit(): void {
    this.loading = true;
    if (!this.newProducto.codigo) {
      this.newProducto.codigo = 'SKU-' + this.formCategory.substring(0, 3) + '-' + Math.floor(100 + Math.random() * 900);
    }

    this.productosService.createProducto(this.newProducto).subscribe({
      next: (created) => {
        this.message = `Equipo "${created.nombre}" registrado exitosamente en PostgreSQL.`;
        this.isError = false;
        this.newProducto = { codigo: '', nombre: '', descripcion: '', precio: 0, stock: 0 };
        this.closeModal();
        this.loadProductos();
      },
      error: (err) => {
        console.error('Error al crear producto:', err);
        this.message = 'Error al publicar equipo. Verificá los permisos del token.';
        this.isError = true;
        this.loading = false;
      }
    });
  }

  deleteProducto(id: number): void {
    if (!confirm(`¿Eliminar equipo #${id}? Esta acción impactará el inventario en PostgreSQL.`)) return;
    this.productosService.deleteProducto(id).subscribe({
      next: () => {
        this.message = `Equipo #${id} eliminado correctamente.`;
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
