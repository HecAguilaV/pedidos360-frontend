import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PedidosService } from '../../services/pedidos.service';
import { AuthService } from '../../services/auth.service';
import { Pedido } from '../../models/pedido.model';

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="orders-page">
      <!-- Encabezado de Gestión de Órdenes -->
      <section class="orders-hero">
        <div class="hero-top-row">
          <div class="hero-badge">
            <i class="ph ph-receipt"></i>
            <span>GESTIÓN DE ADQUISICIONES · ASINCRONÍA DE EVENTOS</span>
          </div>
          <div class="tech-indicator">
            <span class="pulse-green"></span>
            <code>pedidos-service:8081</code> (RabbitMQ Publisher)
          </div>
        </div>

        <div class="hero-main-row">
          <div>
            <h1 class="hero-title">Órdenes de Compra & Contratos</h1>
            <p class="hero-subtitle">
              Registro transaccional de pedidos corporativos. Cada orden confirmada emite un evento <code>orden.creada</code> hacia RabbitMQ para la actualización de stock, facturación y despacho.
            </p>
          </div>

          <div class="hero-actions" *ngIf="authService.isAdmin()">
            <button class="btn-create-order" (click)="openModal()">
              <i class="ph ph-plus-circle"></i>
              <span>Emitir Orden Manual</span>
            </button>
          </div>
        </div>

        <!-- Métricas Rápidas de Órdenes -->
        <div class="orders-kpi-bar">
          <div class="kpi-mini-card">
            <span class="kpi-mini-label">Total Órdenes</span>
            <strong class="kpi-mini-value">{{ pedidos.length }}</strong>
          </div>
          <div class="kpi-mini-card">
            <span class="kpi-mini-label">Monto Transaccionado</span>
            <strong class="kpi-mini-value">\${{ totalFacturado | number:'1.2-2' }}</strong>
          </div>
          <div class="kpi-mini-card">
            <span class="kpi-mini-label">Despachos Gestionados</span>
            <strong class="kpi-mini-value">{{ ordenesDespachadas }}</strong>
          </div>
          <div class="kpi-mini-card">
            <span class="kpi-mini-label">Broker de Mensajería</span>
            <strong class="kpi-mini-value highlight"><i class="ph ph-lightning"></i> RabbitMQ Active</strong>
          </div>
        </div>
      </section>

      <!-- Barra de Herramientas y Filtros -->
      <section class="toolbar-section">
        <div class="search-input-wrapper">
          <i class="ph ph-magnifying-glass"></i>
          <input 
            type="text" 
            [(ngModel)]="searchTerm" 
            placeholder="Buscar por cliente, ID de orden o estado..." 
          />
          <button *ngIf="searchTerm" (click)="searchTerm = ''" class="btn-clear-search">
            <i class="ph ph-x"></i>
          </button>
        </div>

        <!-- Filtros Rápidos de Estado -->
        <div class="status-filters-pills">
          <button 
            class="status-pill-btn" 
            [class.active]="filterEstado === 'TODOS'" 
            (click)="filterEstado = 'TODOS'">
            Todos ({{ pedidos.length }})
          </button>
          <button 
            class="status-pill-btn" 
            [class.active]="filterEstado === 'CONFIRMADO'" 
            (click)="filterEstado = 'CONFIRMADO'">
            Confirmados
          </button>
          <button 
            class="status-pill-btn" 
            [class.active]="filterEstado === 'ENVIADO'" 
            (click)="filterEstado = 'ENVIADO'">
            En Camino
          </button>
          <button 
            class="status-pill-btn" 
            [class.active]="filterEstado === 'ENTREGADO'" 
            (click)="filterEstado = 'ENTREGADO'">
            Entregados
          </button>
        </div>
      </section>

      <!-- Toast Banner -->
      <div class="feedback-banner" *ngIf="message" [class.error]="isError">
        <div class="feedback-content">
          <i class="ph" [class.ph-check-circle]="!isError" [class.ph-warning-circle]="isError"></i>
          <span>{{ message }}</span>
        </div>
        <button class="btn-close-toast" (click)="message = ''"><i class="ph ph-x"></i></button>
      </div>

      <!-- Estado de Carga -->
      <div *ngIf="loading && pedidos.length === 0" class="orders-loading-state">
        <i class="ph ph-spinner ph-spin"></i>
        <span>Consultando órdenes en PostgreSQL Cloud...</span>
      </div>

      <!-- Grid de Órdenes Empresariales -->
      <section class="orders-list-section" *ngIf="!loading && filteredPedidos.length > 0">
        <article class="order-card" *ngFor="let ped of filteredPedidos">
          <!-- Card Header -->
          <div class="order-card-header">
            <div class="order-identity">
              <span class="order-number">ORDEN #{{ ped.id }}</span>
              <span class="order-date"><i class="ph ph-calendar-blank"></i> {{ ped.fecha | date:'dd/MM/yyyy · HH:mm' }}</span>
            </div>

            <div class="order-badges-group">
              <span class="event-dispatched-badge">
                <i class="ph ph-lightning"></i> orden.creada
              </span>
              <span class="order-status-badge" [ngClass]="ped.estado.toLowerCase()">
                <i class="ph" [ngClass]="getStatusIcon(ped.estado)"></i>
                <span>{{ ped.estado }}</span>
              </span>
            </div>
          </div>

          <!-- Card Body -->
          <div class="order-card-body">
            <div class="client-info-box">
              <div class="client-avatar">{{ ped.cliente.charAt(0) }}</div>
              <div class="client-details">
                <span class="client-label">CLIENTE / RAZÓN SOCIAL</span>
                <strong class="client-name">{{ ped.cliente }}</strong>
              </div>
            </div>

            <div class="order-financial-box">
              <span class="financial-label">MONTO TRANSACCIONADO</span>
              <strong class="financial-total">\${{ ped.total | number:'1.2-2' }} <small>USD</small></strong>
            </div>
          </div>

          <!-- Card Footer con Acciones -->
          <div class="order-card-footer">
            <div class="footer-meta">
              <span class="meta-service"><i class="ph ph-check-circle"></i> Sincronizado vía RabbitMQ</span>
            </div>

            <div class="order-actions">
              <button class="btn-track-order" (click)="irATracking(ped.id!)">
                <i class="ph ph-truck"></i>
                <span>Rastrear Despacho</span>
              </button>

              <button 
                *ngIf="authService.isAdmin()" 
                class="btn-order-delete" 
                (click)="deletePedido(ped.id!)"
                title="Eliminar orden (ROLE_ADMIN)">
                <i class="ph ph-trash"></i>
              </button>
            </div>
          </div>
        </article>
      </section>

      <!-- Estado Vacío -->
      <div *ngIf="!loading && filteredPedidos.length === 0" class="orders-empty-state">
        <div class="empty-icon-circle">
          <i class="ph ph-shopping-bag"></i>
        </div>
        <h3>No se encontraron órdenes registradas</h3>
        <p>No existen registros que coincidan con los filtros actuales o aún no se han confirmado compras desde el catálogo.</p>
        <button class="btn-reset-filters" (click)="resetFilters()">Ver todas las órdenes</button>
      </div>

      <!-- MODAL CORPORATIVO: EMISIÓN MANUAL DE PEDIDO (ADMIN) -->
      <div class="modal-backdrop" *ngIf="showModal" (click)="closeModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-box">
              <div class="modal-icon-badge">
                <i class="ph ph-receipt"></i>
              </div>
              <div>
                <h3>Emitir Orden de Compra Manual</h3>
                <p>Publicación de evento hacia RabbitMQ mediante <code>pedidos-service</code></p>
              </div>
            </div>
            <button class="btn-modal-close" (click)="closeModal()"><i class="ph ph-x"></i></button>
          </div>

          <form (ngSubmit)="onSubmit()">
            <div class="modal-body">
              <div class="form-group">
                <label>Nombre del Cliente / Razón Social *</label>
                <input type="text" [(ngModel)]="newPedido.cliente" name="cliente" placeholder="Ej: TechCorp Chile SpA" required />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Monto Total (USD) *</label>
                  <input type="number" step="0.01" [(ngModel)]="newPedido.total" name="total" placeholder="1850.00" required />
                </div>
                <div class="form-group">
                  <label>Estado Inicial de la Orden</label>
                  <select [(ngModel)]="newPedido.estado" name="estado">
                    <option value="CONFIRMADO">CONFIRMADO</option>
                    <option value="ENVIADO">ENVIADO</option>
                    <option value="ENTREGADO">ENTREGADO</option>
                    <option value="PENDIENTE">PENDIENTE</option>
                  </select>
                </div>
              </div>

              <div class="cloud-spec-note">
                <i class="ph ph-lightning"></i>
                <span>Al registrarse, el microservicio publicará el evento de dominio <code>orden.creada</code> a RabbitMQ.</span>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-cancel" (click)="closeModal()">Cancelar</button>
              <button type="submit" class="btn-submit" [disabled]="loading">
                <i class="ph" [ngClass]="loading ? 'ph-spinner ph-spin' : 'ph-floppy-disk'"></i>
                <span>{{ loading ? 'Procesando...' : 'Confirmar y Emitir Orden' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .orders-page {
      max-width: 1400px;
      margin: 0 auto;
      padding: 32px 24px 64px 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Hero Banner */
    .orders-hero {
      background: var(--surface-white);
      border: 1px solid var(--corp-200);
      border-radius: var(--radius-lg);
      padding: 28px 32px 24px 32px;
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

    .hero-subtitle code {
      background: var(--brand-blue-subtle);
      color: var(--brand-blue);
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
      font-weight: 700;
    }

    .btn-create-order {
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

    .btn-create-order:hover {
      background: var(--corp-800);
      transform: translateY(-1px);
    }

    /* KPI Bar */
    .orders-kpi-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-top: 20px;
    }

    .kpi-mini-card {
      background: var(--corp-50);
      border: 1px solid var(--corp-200);
      border-radius: var(--radius-md);
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .kpi-mini-label {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--corp-500);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .kpi-mini-value {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--corp-900);
      letter-spacing: -0.3px;
    }

    .kpi-mini-value.highlight {
      color: var(--brand-blue);
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 1.15rem;
    }

    /* Toolbar */
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
      max-width: 420px;
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

    .status-filters-pills {
      display: flex;
      gap: 8px;
      overflow-x: auto;
    }

    .status-pill-btn {
      padding: 6px 14px;
      border-radius: var(--radius-full);
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--corp-600);
      background: var(--surface-white);
      border: 1px solid var(--corp-200);
      transition: all 0.15s ease;
    }

    .status-pill-btn:hover {
      background: var(--corp-100);
      color: var(--corp-900);
    }

    .status-pill-btn.active {
      background: var(--corp-900);
      border-color: var(--corp-900);
      color: var(--surface-white);
    }

    /* Feedback Banner */
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

    /* Orders Grid */
    .orders-list-section {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
      gap: 20px;
    }

    .order-card {
      background: var(--surface-white);
      border: 1px solid var(--corp-200);
      border-radius: var(--radius-lg);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      box-shadow: var(--shadow-subtle);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .order-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-hover);
    }

    .order-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--corp-100);
    }

    .order-identity {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .order-number {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--corp-900);
      font-family: var(--font-mono);
      letter-spacing: -0.3px;
    }

    .order-date {
      font-size: 0.75rem;
      color: var(--corp-400);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .order-badges-group {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
    }

    .event-dispatched-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      background: var(--brand-blue-subtle);
      color: var(--brand-blue);
      font-family: var(--font-mono);
    }

    .order-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border-radius: var(--radius-full);
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .order-status-badge.pendiente {
      background: var(--status-warning-subtle);
      color: var(--status-warning);
    }

    .order-status-badge.confirmado {
      background: var(--brand-blue-subtle);
      color: var(--brand-blue);
    }

    .order-status-badge.enviado {
      background: #ede9fe;
      color: #6d28d9;
    }

    .order-status-badge.entregado {
      background: var(--commerce-emerald-subtle);
      color: var(--commerce-emerald);
    }

    /* Body */
    .order-card-body {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      background: var(--corp-50);
      padding: 16px;
      border-radius: var(--radius-md);
      border: 1px solid var(--corp-100);
    }

    .client-info-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .client-avatar {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-full);
      background: linear-gradient(135deg, var(--corp-800) 0%, var(--corp-900) 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 1rem;
    }

    .client-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .client-label {
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--corp-400);
      letter-spacing: 0.5px;
    }

    .client-name {
      font-size: 0.95rem;
      color: var(--corp-900);
    }

    .order-financial-box {
      text-align: right;
    }

    .financial-label {
      display: block;
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--corp-400);
      letter-spacing: 0.5px;
    }

    .financial-total {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--commerce-emerald);
      letter-spacing: -0.3px;
    }

    .financial-total small {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--corp-500);
    }

    /* Footer */
    .order-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding-top: 4px;
    }

    .footer-meta {
      font-size: 0.75rem;
      color: var(--corp-500);
    }

    .meta-service {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--commerce-emerald);
      font-weight: 600;
    }

    .order-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-track-order {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      background: var(--corp-900);
      color: var(--surface-white);
      border-radius: var(--radius-sm);
      font-size: 0.8rem;
      font-weight: 700;
      transition: background 0.15s;
    }

    .btn-track-order:hover {
      background: var(--corp-800);
    }

    .btn-order-delete {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--corp-400);
      border: 1px solid var(--corp-200);
      transition: all 0.15s;
    }

    .btn-order-delete:hover {
      color: var(--status-danger);
      background: var(--status-danger-subtle);
      border-color: rgba(220, 38, 38, 0.3);
    }

    /* Empty and Loading States */
    .orders-loading-state, .orders-empty-state {
      padding: 60px 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: var(--corp-500);
    }

    .orders-loading-state i {
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

    .orders-empty-state h3 {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--corp-800);
    }

    .orders-empty-state p {
      font-size: 0.88rem;
      max-width: 440px;
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

    /* Modal Form */
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
      max-width: 520px;
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

    .form-group input, .form-group select {
      padding: 10px 14px;
      border-radius: var(--radius-md);
      border: 1px solid var(--corp-200);
      font-size: 0.9rem;
      color: var(--corp-900);
      outline: none;
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
      background: var(--brand-blue-subtle);
      border: 1px solid rgba(29, 78, 216, 0.2);
      padding: 10px 14px;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      color: var(--corp-700);
    }

    .cloud-spec-note i {
      color: var(--brand-blue);
      font-size: 1.1rem;
    }

    .cloud-spec-note code {
      font-family: var(--font-mono);
      color: var(--brand-blue);
      font-weight: 700;
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
    estado: 'CONFIRMADO',
    total: 0
  };

  constructor(
    private pedidosService: PedidosService,
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPedidos();
  }

  get totalFacturado(): number {
    return this.pedidos.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
  }

  get ordenesDespachadas(): number {
    return this.pedidos.filter(p => p.estado === 'ENVIADO' || p.estado === 'ENTREGADO').length;
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

  getStatusIcon(status: string): string {
    switch (status) {
      case 'PENDIENTE': return 'ph-clock';
      case 'CONFIRMADO': return 'ph-check-circle';
      case 'ENVIADO': return 'ph-truck';
      case 'ENTREGADO': return 'ph-house-line';
      default: return 'ph-circle';
    }
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
        this.message = 'No se pudo conectar con el microservicio pedidos-service (puerto 8081).';
        this.isError = true;
        this.loading = false;
      }
    });
  }

  irATracking(orderId: number): void {
    this.router.navigate(['/tracking']);
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.filterEstado = 'TODOS';
  }

  openModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  onSubmit(): void {
    this.loading = true;
    this.pedidosService.createPedido(this.newPedido).subscribe({
      next: (created) => {
        this.message = `Orden #${created.id} emitida exitosamente hacia RabbitMQ.`;
        this.isError = false;
        this.newPedido = { cliente: '', estado: 'CONFIRMADO', total: 0 };
        this.closeModal();
        this.loadPedidos();
      },
      error: (err) => {
        console.error('Error al crear pedido:', err);
        this.message = 'Error al registrar pedido. Verificá los permisos del token.';
        this.isError = true;
        this.loading = false;
      }
    });
  }

  deletePedido(id: number): void {
    if (!confirm(`¿Eliminar orden #${id}? Requiere permisos ROLE_ADMIN.`)) return;
    this.pedidosService.deletePedido(id).subscribe({
      next: () => {
        this.message = `Orden #${id} eliminada correctamente.`;
        this.isError = false;
        this.loadPedidos();
      },
      error: (err) => {
        console.error('Error al eliminar pedido:', err);
        this.message = 'Error: la eliminación requiere rol ADMIN.';
        this.isError = true;
      }
    });
  }
}
