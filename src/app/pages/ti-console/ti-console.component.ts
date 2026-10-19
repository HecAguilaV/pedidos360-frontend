import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

interface RabbitQueue {
  name: string;
  messages_ready: number;
  messages_unacknowledged: number;
  consumers: number;
  state: string;
}

interface ServiceConsumerControl {
  name: string;
  serviceId: string;
  queue: string;
  exchange: string;
  type: 'Pub/Sub' | 'P2P';
  endpoint: string;
  running: boolean;
  loading: boolean;
  dockerCmd: string;
}

interface PostmanScenario {
  id: string;
  title: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  bodyType: 'none' | 'json' | 'form';
  jsonBody?: string;
  formFields?: { key: string; value: string }[];
  requiresAuth: boolean;
}

@Component({
  selector: 'app-ti-console',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-shell">
      <!-- Header -->
      <div class="page-header">
        <div>
          <span class="page-eyebrow">
            <i class="ph ph-terminal-window"></i> Modo Desarrollador · Consola TI
          </span>
          <h1 class="page-title">Topología AMQP, Colas y Pruebas API</h1>
          <p class="page-subtitle">
            Monitoreo en vivo de RabbitMQ, control de pausa/reanudación de consumidores por microservicio y suite de pruebas tipo Postman.
          </p>
        </div>
        <div class="page-actions">
          <button class="btn btn-outline" (click)="refreshAll()">
            <i class="ph ph-arrows-clockwise" [class.ph-spin]="refreshing()"></i>
            <span>Actualizar Todo</span>
          </button>
          <button
            type="button"
            class="btn"
            [ngClass]="autoRefresh() ? 'btn-blue' : 'btn-outline'"
            (click)="toggleAutoRefresh()">
            <i class="ph" [ngClass]="autoRefresh() ? 'ph-check-circle' : 'ph-clock'"></i>
            <span>Auto-refresco (3s): {{ autoRefresh() ? 'ON' : 'OFF' }}</span>
          </button>
        </div>
      </div>

      <!-- Error / Alert Banner -->
      <div class="alert-banner" *ngIf="consoleMessage()" [class.error]="isError()" [class.success]="!isError()">
        <span>
          <i class="ph" [class.ph-check-circle]="!isError()" [class.ph-warning-circle]="isError()"></i>
          {{ consoleMessage() }}
        </span>
        <button class="btn-danger-ghost" (click)="consoleMessage.set('')"><i class="ph ph-x"></i></button>
      </div>

      <!-- Navigation Tabs: Topología / Consumidores vs Mini-Postman -->
      <div class="console-tabs-nav">
        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab() === 'RABBITMQ'"
          (click)="activeTab.set('RABBITMQ')">
          <i class="ph ph-graph"></i>
          <span>Topología AMQP & Consumidores</span>
        </button>
        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab() === 'POSTMAN'"
          (click)="activeTab.set('POSTMAN')">
          <i class="ph ph-paper-plane-tilt"></i>
          <span>Mini-Postman (Pruebas Rubric & cURL)</span>
        </button>
      </div>

      <!-- =====================================================================
           TAB 1: RABBITMQ DASHBOARD & CONSUMER PAUSE/RESUME (T20, T21)
           ===================================================================== -->
      <div *ngIf="activeTab() === 'RABBITMQ'" class="tab-body">
        <!-- Topología Arquitectónica Resumen -->
        <div class="kpi-strip">
          <div class="kpi-card">
            <div class="kpi-header">
              <span>Exchanges Configurados</span>
              <i class="ph ph-git-fork"></i>
            </div>
            <div class="kpi-value">2</div>
            <div class="kpi-meta">1 Pub/Sub (Topic) + 1 P2P (Direct)</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <span>Colas Durables</span>
              <i class="ph ph-tray"></i>
            </div>
            <div class="kpi-value">{{ queues().length || 6 }}</div>
            <div class="kpi-meta">5 Pub/Sub + 1 P2P</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <span>Mensajes Listos (Ready)</span>
              <i class="ph ph-hourglass-high"></i>
            </div>
            <div class="kpi-value" [style.color]="totalReadyMessages() > 0 ? 'var(--status-warning)' : 'inherit'">
              {{ totalReadyMessages() }}
            </div>
            <div class="kpi-meta">En espera de ser procesados</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <span>Consumidores Activos</span>
              <i class="ph ph-broadcast"></i>
            </div>
            <div class="kpi-value">{{ totalActiveConsumers() }}</div>
            <div class="kpi-meta">Conexiones AMQP abiertas</div>
          </div>
        </div>

        <!-- Diagrama Resumido de Exchanges -->
        <div class="exchanges-cards-grid">
          <div class="crm-card exchange-card">
            <div class="exchange-card-top">
              <span class="status-pill info">Pub/Sub Fan-out</span>
              <span class="mono-code">Topic Exchange</span>
            </div>
            <h3>orders.exchange</h3>
            <p>Emite el evento <code>orden.creada</code> hacia 5 colas en paralelo: stock, pagos, envíos, notificaciones y carrito.</p>
            <div class="exchange-queues-list">
              <span class="tag">stock-decrement</span>
              <span class="tag">order-payments</span>
              <span class="tag">shipping-dispatch</span>
              <span class="tag">order-notifications</span>
              <span class="tag">cart-clear</span>
            </div>
          </div>

          <div class="crm-card exchange-card">
            <div class="exchange-card-top">
              <span class="status-pill success">Punto a Punto (P2P)</span>
              <span class="mono-code">Direct Exchange</span>
            </div>
            <h3>payments.direct.exchange</h3>
            <p>Emite el evento <code>pago.procesado</code> exclusivamente hacia <code>pedidos-service</code> con routing key <code>pago.procesado</code>.</p>
            <div class="exchange-queues-list">
              <span class="tag">order-payment-confirmed</span>
            </div>
          </div>
        </div>

        <!-- Control de Consumidores por Microservicio -->
        <div class="crm-card section-card">
          <div class="crm-card-header">
            <div class="crm-card-title">
              <i class="ph ph-toggle-left"></i>
              <span>Control de Consumidores AMQP (RabbitListener)</span>
            </div>
            <span style="font-size: 0.8rem; color: var(--corp-500);">
              Pausa el consumo sin reiniciar la JVM para demostrar acumulación y drenaje inmediato en la evaluación.
            </span>
          </div>

          <div class="crm-table-wrap">
            <table class="crm-table">
              <thead>
                <tr>
                  <th>Microservicio</th>
                  <th>Topología</th>
                  <th>Cola AMQP</th>
                  <th>Estado Listener</th>
                  <th>Acción en Vivo</th>
                  <th>Comando SSH Alternativo</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let s of serviceControls()">
                  <td>
                    <strong>{{ s.name }}</strong>
                    <div style="font-size: 0.74rem; color: var(--corp-500);">{{ s.serviceId }}</div>
                  </td>
                  <td>
                    <span class="status-pill" [ngClass]="s.type === 'P2P' ? 'success' : 'info'">
                      {{ s.type }}
                    </span>
                  </td>
                  <td><span class="mono-code">{{ s.queue }}</span></td>
                  <td>
                    <span class="status-pill" [ngClass]="s.running ? 'success' : 'warning'">
                      <i class="ph" [ngClass]="s.running ? 'ph-play' : 'ph-pause'"></i>
                      {{ s.running ? 'ACTIVO' : 'PAUSADO' }}
                    </span>
                  </td>
                  <td>
                    <button
                      *ngIf="s.running"
                      type="button"
                      class="btn btn-outline btn-sm btn-pause"
                      [disabled]="s.loading"
                      (click)="toggleConsumer(s, false)">
                      <i class="ph ph-pause"></i>
                      <span>Pausar Consumidor</span>
                    </button>
                    <button
                      *ngIf="!s.running"
                      type="button"
                      class="btn btn-blue btn-sm btn-resume"
                      [disabled]="s.loading"
                      (click)="toggleConsumer(s, true)">
                      <i class="ph ph-play"></i>
                      <span>Reanudar Consumidor</span>
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      class="btn-copy-code"
                      (click)="copyToClipboard(s.dockerCmd)"
                      title="Copiar comando docker compose">
                      <code>{{ s.dockerCmd }}</code>
                      <i class="ph ph-copy"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Estado en Vivo de las Colas en RabbitMQ Management API -->
        <div class="crm-card section-card">
          <div class="crm-card-header">
            <div class="crm-card-title">
              <i class="ph ph-tray"></i>
              <span>Estado Operativo de Colas RabbitMQ</span>
            </div>
            <button class="btn btn-outline btn-sm" (click)="loadRabbitQueues()">
              <i class="ph ph-arrows-clockwise"></i>
              <span>Actualizar Colas</span>
            </button>
          </div>

          <div class="crm-table-wrap">
            <table class="crm-table">
              <thead>
                <tr>
                  <th>Nombre de Cola</th>
                  <th>Mensajes Listos (Ready)</th>
                  <th>En Procesamiento (Unacked)</th>
                  <th>Consumidores Conectados</th>
                  <th>Estado Operativo</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let q of queues()">
                  <td><span class="mono-code">{{ q.name }}</span></td>
                  <td>
                    <strong [style.color]="q.messages_ready > 0 ? 'var(--status-warning)' : 'var(--corp-900)'">
                      {{ q.messages_ready }}
                    </strong>
                    <span *ngIf="q.messages_ready > 0" class="badge-accumulating">Acumulando</span>
                  </td>
                  <td>{{ q.messages_unacknowledged }}</td>
                  <td>
                    <span [style.color]="q.consumers === 0 ? 'var(--status-danger)' : 'var(--commerce-emerald)'">
                      <strong>{{ q.consumers }}</strong> consumidor(es)
                    </span>
                  </td>
                  <td>
                    <span class="status-pill" [ngClass]="getQueueStatusClass(q)">
                      {{ getQueueStatusText(q) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="empty-box" *ngIf="queues().length === 0">
            <i class="ph ph-shield-check"></i>
            <h4>RabbitMQ Management API Protegido en Red Privada</h4>
            <p>Por seguridad Cloud Native y prevención de accesos no autorizados, el broker opera aislado de internet. Acceso administrativo vía túnel SSH en el puerto 15672.</p>
          </div>
        </div>
      </div>

      <!-- =====================================================================
           TAB 2: MINI-POSTMAN TEST SUITE (T22)
           ===================================================================== -->
      <div *ngIf="activeTab() === 'POSTMAN'" class="tab-body">
        <div class="postman-grid">
          <!-- Columna Izquierda: Lista de Escenarios Predefinidos -->
          <div class="crm-card postman-scenarios-sidebar">
            <div class="crm-card-header">
              <div class="crm-card-title">
                <i class="ph ph-list-numbers"></i>
                <span>Escenarios del Rubric</span>
              </div>
            </div>
            <div class="scenarios-list">
              <button
                *ngFor="let sc of scenarios"
                type="button"
                class="scenario-item-btn"
                [class.selected]="selectedScenario.id === sc.id"
                (click)="selectScenario(sc)">
                <div class="scenario-item-top">
                  <span class="method-badge" [class]="sc.method.toLowerCase()">{{ sc.method }}</span>
                  <span class="scenario-item-title">{{ sc.title }}</span>
                </div>
                <div class="scenario-item-desc">{{ sc.description }}</div>
              </button>
            </div>
          </div>

          <!-- Columna Derecha: Consola de Petición y Respuesta -->
          <div class="crm-card postman-runner-panel">
            <div class="crm-card-header">
              <div class="crm-card-title">
                <i class="ph ph-play-circle"></i>
                <span>Ejecutor de Solicitud HTTP</span>
              </div>
              <div class="auth-mode-select">
                <label>Modo de Autenticación:</label>
                <select class="form-select" [(ngModel)]="authMode">
                  <option value="CURRENT_JWT">Token JWT de Sesión Actual (Bearer)</option>
                  <option value="NO_AUTH">Sin Token (Simular Petición Anónima 401)</option>
                </select>
              </div>
            </div>

            <div class="runner-body">
              <!-- URL Bar -->
              <div class="request-url-bar">
                <span class="method-tag" [class]="selectedScenario.method.toLowerCase()">
                  {{ selectedScenario.method }}
                </span>
                <input
                  type="text"
                  class="form-input request-url-input"
                  [(ngModel)]="requestUrl"
                  placeholder="/api/..."
                />
                <button
                  type="button"
                  class="btn btn-blue"
                  [disabled]="executingRequest()"
                  (click)="executeRequest()">
                  <i class="ph" [ngClass]="executingRequest() ? 'ph-spinner ph-spin' : 'ph-paper-plane-right'"></i>
                  <span>{{ executingRequest() ? 'Ejecutando...' : 'Enviar' }}</span>
                </button>
              </div>

              <!-- Payload Editor (si aplica) -->
              <div class="request-payload-section" *ngIf="selectedScenario.bodyType !== 'none'">
                <div class="payload-header">
                  <label>Cuerpo de la Solicitud ({{ selectedScenario.bodyType === 'json' ? 'application/json' : 'multipart/form-data' }}):</label>
                </div>

                <!-- JSON Editor -->
                <textarea
                  *ngIf="selectedScenario.bodyType === 'json'"
                  class="form-textarea payload-editor"
                  rows="7"
                  [(ngModel)]="requestPayload">
                </textarea>

                <!-- Form Data Table -->
                <div *ngIf="selectedScenario.bodyType === 'form'" class="form-fields-grid">
                  <div *ngFor="let field of formFields; let i = index" class="form-grid-2" style="margin-bottom: 8px;">
                    <input type="text" class="form-input" [(ngModel)]="field.key" placeholder="Campo" />
                    <input type="text" class="form-input" [(ngModel)]="field.value" placeholder="Valor" />
                  </div>
                </div>
              </div>

              <!-- Equivalente cURL para Copiar -->
              <div class="curl-copy-box">
                <div class="curl-box-header">
                  <span><i class="ph ph-terminal"></i> Comando cURL Equivalente (Terminal / Evaluación):</span>
                  <button type="button" class="btn btn-outline btn-sm" (click)="copyToClipboard(generatedCurl())">
                    <i class="ph ph-copy"></i>
                    <span>Copiar cURL</span>
                  </button>
                </div>
                <pre class="curl-code-snippet"><code>{{ generatedCurl() }}</code></pre>
              </div>

              <!-- Panel de Respuesta -->
              <div class="response-section" *ngIf="responseResult() as res">
                <div class="response-meta-bar">
                  <div class="response-status-badge" [class.success]="res.status >= 200 && res.status < 300" [class.error]="res.status >= 400">
                    <i class="ph" [class.ph-check-circle]="res.status < 400" [class.ph-warning-circle]="res.status >= 400"></i>
                    <span>HTTP {{ res.status }} {{ res.statusText }}</span>
                  </div>
                  <div class="response-latency">
                    <i class="ph ph-timer"></i>
                    <span>Latencia: <strong>{{ res.latencyMs }} ms</strong></span>
                  </div>
                  <div class="response-time">
                    <span>{{ res.timestamp | date:'HH:mm:ss' }}</span>
                  </div>
                </div>

                <div class="response-body-box">
                  <pre class="response-json"><code>{{ res.body }}</code></pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .console-tabs-nav {
      display: flex;
      gap: 8px;
      margin-bottom: 22px;
      border-bottom: 1px solid var(--corp-200);
      padding-bottom: 8px;
    }
    .console-tabs-nav .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: var(--radius-md);
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--corp-600);
      background: transparent;
    }
    .console-tabs-nav .tab-btn.active {
      background: var(--corp-900);
      color: var(--surface-white);
    }
    .exchanges-cards-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .exchange-card {
      padding: 20px;
    }
    .exchange-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .exchange-card h3 {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--corp-900);
      margin-bottom: 6px;
    }
    .exchange-card p {
      font-size: 0.85rem;
      color: var(--corp-600);
      margin-bottom: 14px;
    }
    .exchange-queues-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .exchange-queues-list .tag {
      font-family: var(--font-mono);
      font-size: 0.74rem;
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--corp-100);
      color: var(--corp-700);
      border: 1px solid var(--corp-200);
    }
    .section-card {
      margin-bottom: 24px;
    }
    .btn-pause {
      color: var(--status-warning);
      border-color: var(--status-warning-border);
    }
    .btn-resume {
      background: var(--commerce-emerald);
    }
    .btn-copy-code {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      background: var(--corp-100);
      border: 1px solid var(--corp-200);
      border-radius: 4px;
      color: var(--corp-700);
      font-size: 0.74rem;
    }
    .btn-copy-code:hover {
      background: var(--corp-200);
    }
    .badge-accumulating {
      display: inline-block;
      margin-left: 6px;
      padding: 1px 6px;
      font-size: 0.7rem;
      font-weight: 700;
      border-radius: var(--radius-full);
      background: var(--status-warning-subtle);
      color: var(--status-warning);
      border: 1px solid var(--status-warning-border);
    }
    /* Postman Styles */
    .postman-grid {
      display: grid;
      grid-template-columns: 340px 1fr;
      gap: 20px;
      align-items: start;
    }
    .scenarios-list {
      display: flex;
      flex-direction: column;
    }
    .scenario-item-btn {
      text-align: left;
      padding: 14px 18px;
      border-bottom: 1px solid var(--corp-100);
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: background 0.15s;
    }
    .scenario-item-btn:hover {
      background: var(--corp-50);
    }
    .scenario-item-btn.selected {
      background: var(--brand-blue-subtle);
      border-left: 3px solid var(--brand-blue);
    }
    .scenario-item-top {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .method-badge {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .method-badge.get { background: #dbeafe; color: #1e40af; }
    .method-badge.post { background: #dcfce7; color: #15803d; }
    .method-badge.put { background: #fef3c7; color: #92400e; }
    .method-badge.delete { background: #fee2e2; color: #b91c1c; }
    .scenario-item-title {
      font-size: 0.86rem;
      font-weight: 700;
      color: var(--corp-900);
    }
    .scenario-item-desc {
      font-size: 0.76rem;
      color: var(--corp-500);
      line-height: 1.3;
    }
    .runner-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .request-url-bar {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .method-tag {
      font-family: var(--font-mono);
      font-size: 0.82rem;
      font-weight: 800;
      padding: 9px 14px;
      border-radius: var(--radius-sm);
      color: #ffffff;
      background: var(--corp-800);
    }
    .method-tag.get { background: #2563eb; }
    .method-tag.post { background: #059669; }
    .method-tag.put { background: #d97706; }
    .method-tag.delete { background: #dc2626; }
    .request-url-input {
      font-family: var(--font-mono);
      font-size: 0.88rem;
    }
    .payload-header label {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--corp-700);
    }
    .payload-editor {
      font-family: var(--font-mono);
      font-size: 0.82rem;
      margin-top: 6px;
      background: #0f172a;
      color: #f8fafc;
      border-radius: var(--radius-sm);
    }
    .curl-copy-box {
      background: var(--corp-50);
      border: 1px solid var(--corp-200);
      border-radius: var(--radius-md);
      padding: 12px 16px;
    }
    .curl-box-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--corp-700);
      margin-bottom: 8px;
    }
    .curl-code-snippet {
      background: #0f172a;
      color: #38bdf8;
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
      font-size: 0.78rem;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .response-section {
      background: var(--surface-white);
      border: 1px solid var(--corp-200);
      border-radius: var(--radius-md);
      overflow: hidden;
    }
    .response-meta-bar {
      padding: 10px 16px;
      background: var(--corp-50);
      border-bottom: 1px solid var(--corp-200);
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 0.82rem;
    }
    .response-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border-radius: var(--radius-full);
      font-weight: 700;
      font-size: 0.8rem;
    }
    .response-status-badge.success {
      background: var(--commerce-emerald-subtle);
      color: var(--commerce-emerald-hover);
      border: 1px solid var(--commerce-emerald-border);
    }
    .response-status-badge.error {
      background: var(--status-danger-subtle);
      color: var(--status-danger);
      border: 1px solid var(--status-danger-border);
    }
    .response-latency {
      color: var(--corp-600);
    }
    .response-time {
      margin-left: auto;
      color: var(--corp-400);
      font-size: 0.75rem;
    }
    .response-body-box {
      padding: 14px 16px;
      max-height: 380px;
      overflow-y: auto;
      background: #0f172a;
    }
    .response-json {
      color: #f8fafc;
      font-family: var(--font-mono);
      font-size: 0.82rem;
      white-space: pre-wrap;
    }
    @media (max-width: 960px) {
      .postman-grid {
        grid-template-columns: 1fr;
      }
      .exchanges-cards-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class TiConsoleComponent implements OnInit, OnDestroy {
  activeTab = signal<'RABBITMQ' | 'POSTMAN'>('RABBITMQ');
  autoRefresh = signal<boolean>(false);
  refreshing = signal<boolean>(false);
  consoleMessage = signal<string>('');
  isError = signal<boolean>(false);

  queues = signal<RabbitQueue[]>([]);
  serviceControls = signal<ServiceConsumerControl[]>([
    {
      name: 'productos-service',
      serviceId: 'StockOrderEventListener',
      queue: 'stock-decrement',
      exchange: 'orders.exchange',
      type: 'Pub/Sub',
      endpoint: '/api/v1/productos/ops/listener',
      running: true,
      loading: false,
      dockerCmd: 'docker compose stop productos-service'
    },
    {
      name: 'pagos-service',
      serviceId: 'OrderPaymentListener',
      queue: 'order-payments',
      exchange: 'orders.exchange',
      type: 'Pub/Sub',
      endpoint: '/api/v1/pagos/ops/listener',
      running: true,
      loading: false,
      dockerCmd: 'docker compose stop pagos-service'
    },
    {
      name: 'envios-service',
      serviceId: 'ShippingOrderEventListener',
      queue: 'shipping-dispatch',
      exchange: 'orders.exchange',
      type: 'Pub/Sub',
      endpoint: '/api/v1/envios/ops/listener',
      running: true,
      loading: false,
      dockerCmd: 'docker compose stop envios-service'
    },
    {
      name: 'notifications-service',
      serviceId: 'OrderNotificationListener',
      queue: 'order-notifications',
      exchange: 'orders.exchange',
      type: 'Pub/Sub',
      endpoint: '/api/v1/notificaciones/ops/listener',
      running: true,
      loading: false,
      dockerCmd: 'docker compose stop notifications-service'
    },
    {
      name: 'carrito-service',
      serviceId: 'CartOrderEventListener',
      queue: 'cart-clear',
      exchange: 'orders.exchange',
      type: 'Pub/Sub',
      endpoint: '/api/v1/carrito/ops/listener',
      running: true,
      loading: false,
      dockerCmd: 'docker compose stop carrito-service'
    },
    {
      name: 'pedidos-service',
      serviceId: 'PaymentProcessedListener',
      queue: 'order-payment-confirmed',
      exchange: 'payments.direct.exchange',
      type: 'P2P',
      endpoint: '/api/v1/pedidos/ops/listener',
      running: true,
      loading: false,
      dockerCmd: 'docker compose stop pedidos-service'
    }
  ]);

  // Mini-Postman state
  readonly scenarios: PostmanScenario[] = [
    {
      id: 'prof-email',
      title: 'POST /api/email/enviar (cURL del Docente)',
      description: 'Envío de correo multipart form-data evaluado en vivo.',
      method: 'POST',
      url: '/api/email/enviar',
      bodyType: 'form',
      formFields: [
        { key: 'to', value: 'profesor@duocuc.cl' },
        { key: 'subject', value: 'Evaluación Cloud Native - Pedidos360' },
        { key: 'body', value: 'Entrega de proyecto Pedidos360: arquitectura Cloud Native, topología RabbitMQ dual y seguridad Azure/Cognito.' }
      ],
      requiresAuth: false
    },
    {
      id: 'create-order',
      title: 'POST /api/v1/pedidos (Crear Orden con Ítems)',
      description: 'Emite evento orden.creada hacia RabbitMQ e inicia el flujo asíncrono.',
      method: 'POST',
      url: '/api/v1/pedidos',
      bodyType: 'json',
      jsonBody: JSON.stringify({
        cliente: 'Empresa Constructora SpA',
        clienteEmail: 'adquisiciones@empresa.cl',
        estado: 'PENDIENTE',
        total: 1529980,
        items: [
          {
            productCode: 'PROD-001',
            productName: 'Laptop Pro 16',
            quantity: 1,
            unitPrice: 1499990
          },
          {
            productCode: 'PROD-002',
            productName: 'Mouse Inalámbrico Ergonómico',
            quantity: 1,
            unitPrice: 29990
          }
        ]
      }, null, 2),
      requiresAuth: true
    },
    {
      id: 'get-catalog',
      title: 'GET /api/v1/productos (Catálogo Público - 200)',
      description: 'Consulta pública de inventario sin autenticación requerida.',
      method: 'GET',
      url: '/api/v1/productos',
      bodyType: 'none',
      requiresAuth: false
    },
    {
      id: 'create-product-unauth',
      title: 'POST /api/v1/productos (Prueba RBAC - 401/403)',
      description: 'Creación de producto que requiere rol ADMIN.',
      method: 'POST',
      url: '/api/v1/productos',
      bodyType: 'json',
      jsonBody: JSON.stringify({
        codigo: 'TEST-001',
        nombre: 'Producto Prueba Seguridad',
        precio: 49990,
        stock: 10,
        descripcion: 'Verificación de rechazo 401 si no hay token admin'
      }, null, 2),
      requiresAuth: true
    },
    {
      id: 'update-shipment-status',
      title: 'PUT /api/v1/envios/101/estado (Logística WMS)',
      description: 'Actualización de despacho por personal de operaciones (rol Despachador).',
      method: 'PUT',
      url: '/api/v1/envios/101/estado',
      bodyType: 'json',
      jsonBody: JSON.stringify({
        estado: 'EN_TRANSITO'
      }, null, 2),
      requiresAuth: true
    },
    {
      id: 'ops-pagos-status',
      title: 'GET /api/v1/pagos/ops/listener/status (Health AMQP)',
      description: 'Inspección del estado del consumidor P2P de pagos.',
      method: 'GET',
      url: '/api/v1/pagos/ops/listener/status',
      bodyType: 'none',
      requiresAuth: true
    }
  ];

  selectedScenario: PostmanScenario = this.scenarios[0];
  requestUrl = this.scenarios[0].url;
  requestPayload = this.scenarios[0].jsonBody || '';
  formFields = this.scenarios[0].formFields ? [...this.scenarios[0].formFields] : [];
  authMode: 'CURRENT_JWT' | 'NO_AUTH' = 'CURRENT_JWT';

  executingRequest = signal<boolean>(false);
  responseResult = signal<{
    status: number;
    statusText: string;
    latencyMs: number;
    timestamp: Date;
    body: string;
  } | null>(null);

  private timerInterval: any = null;

  constructor(
    private http: HttpClient,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.refreshAll();
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  toggleAutoRefresh(): void {
    const next = !this.autoRefresh();
    this.autoRefresh.set(next);
    if (next) {
      this.timerInterval = setInterval(() => {
        this.loadRabbitQueues();
        this.loadAllServiceStatuses();
      }, 3000);
    } else if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  refreshAll(): void {
    this.refreshing.set(true);
    this.loadRabbitQueues();
    this.loadAllServiceStatuses();
    setTimeout(() => this.refreshing.set(false), 500);
  }

  loadRabbitQueues(): void {
    this.http.get<RabbitQueue[]>('/api/ops/rabbitmq/queues').subscribe({
      next: (data) => {
        if (Array.isArray(data)) {
          this.queues.set(data.sort((a, b) => a.name.localeCompare(b.name)));
        }
      },
      error: (err) => {
        console.warn('RabbitMQ management API proxy no disponible en este momento:', err);
      }
    });
  }

  loadAllServiceStatuses(): void {
    const list = this.serviceControls();
    list.forEach(svc => {
      this.http.get<any>(`${svc.endpoint}/status`).subscribe({
        next: (res) => {
          svc.running = !!res.running;
        },
        error: () => {
          // If endpoint is unreachable, retain current state
        }
      });
    });
  }

  toggleConsumer(svc: ServiceConsumerControl, start: boolean): void {
    svc.loading = true;
    const action = start ? 'start' : 'stop';
    this.http.post<any>(`${svc.endpoint}/${action}`, {}).subscribe({
      next: (res) => {
        svc.loading = false;
        svc.running = !!res.running;
        this.consoleMessage.set(`Consumidor de ${svc.name} ${start ? 'reanudado' : 'pausado'} correctamente.`);
        this.isError.set(false);
        this.loadRabbitQueues();
      },
      error: (err) => {
        svc.loading = false;
        console.error(`Error al modificar listener de ${svc.name}:`, err);
        this.consoleMessage.set(`Error al cambiar estado del listener en ${svc.name}. Verifica que tengas rol Administrador.`);
        this.isError.set(true);
      }
    });
  }

  totalReadyMessages(): number {
    return this.queues().reduce((acc, q) => acc + (q.messages_ready || 0), 0);
  }

  totalActiveConsumers(): number {
    return this.queues().reduce((acc, q) => acc + (q.consumers || 0), 0);
  }

  getQueueStatusClass(q: RabbitQueue): string {
    if (q.consumers === 0) return 'warning';
    if (q.messages_ready > 0) return 'info';
    return 'success';
  }

  getQueueStatusText(q: RabbitQueue): string {
    if (q.consumers === 0) return 'Pausada (Acumulando)';
    if (q.messages_ready > 0) return 'Drenando mensajes';
    return 'Activa (En espera)';
  }

  selectScenario(sc: PostmanScenario): void {
    this.selectedScenario = sc;
    this.requestUrl = sc.url;
    this.requestPayload = sc.jsonBody || '';
    this.formFields = sc.formFields ? sc.formFields.map(f => ({ ...f })) : [];
    this.responseResult.set(null);
  }

  generatedCurl(): string {
    const sc = this.selectedScenario;
    const host = window.location.origin;
    const fullUrl = `${host}${this.requestUrl}`;
    const tokenHeader = (this.authMode === 'CURRENT_JWT') ? `  -H "Authorization: Bearer $TOKEN" \\\n` : '';

    if (sc.bodyType === 'form') {
      const fields = this.formFields.map(f => `  -F "${f.key}=${f.value}"`).join(' \\\n');
      return `curl -X POST "${fullUrl}" \\\n${fields}`;
    }

    if (sc.bodyType === 'json') {
      const cleanJson = (this.requestPayload || '{}').replace(/\n/g, ' ');
      return `curl -X ${sc.method} "${fullUrl}" \\\n${tokenHeader}  -H "Content-Type: application/json" \\\n  -d '${cleanJson}'`;
    }

    return `curl -X ${sc.method} "${fullUrl}"${tokenHeader ? ' \\\n' + tokenHeader.replace(' \\\n', '') : ''}`;
  }

  executeRequest(): void {
    this.executingRequest.set(true);
    const startTime = performance.now();

    let headers = new HttpHeaders();
    if (this.authMode === 'NO_AUTH') {
      headers = headers.set('X-Skip-Auth-Interceptor', 'true');
    }

    let requestObservable;

    if (this.selectedScenario.bodyType === 'form') {
      const formData = new FormData();
      this.formFields.forEach(f => formData.append(f.key, f.value));
      requestObservable = this.http.post(this.requestUrl, formData, {
        headers,
        observe: 'response',
        responseType: 'text'
      });
    } else if (this.selectedScenario.method === 'POST') {
      headers = headers.set('Content-Type', 'application/json');
      let body = {};
      try { body = JSON.parse(this.requestPayload); } catch { body = {}; }
      requestObservable = this.http.post(this.requestUrl, body, {
        headers,
        observe: 'response',
        responseType: 'text'
      });
    } else if (this.selectedScenario.method === 'PUT') {
      headers = headers.set('Content-Type', 'application/json');
      let body = {};
      try { body = JSON.parse(this.requestPayload); } catch { body = {}; }
      requestObservable = this.http.put(this.requestUrl, body, {
        headers,
        observe: 'response',
        responseType: 'text'
      });
    } else if (this.selectedScenario.method === 'DELETE') {
      requestObservable = this.http.delete(this.requestUrl, {
        headers,
        observe: 'response',
        responseType: 'text'
      });
    } else {
      requestObservable = this.http.get(this.requestUrl, {
        headers,
        observe: 'response',
        responseType: 'text'
      });
    }

    requestObservable.subscribe({
      next: (resp: any) => {
        const latencyMs = Math.round(performance.now() - startTime);
        this.executingRequest.set(false);
        let formattedBody = resp.body || '';
        try {
          formattedBody = JSON.stringify(JSON.parse(resp.body), null, 2);
        } catch {}

        this.responseResult.set({
          status: resp.status,
          statusText: resp.statusText || 'OK',
          latencyMs,
          timestamp: new Date(),
          body: formattedBody
        });
      },
      error: (err: any) => {
        const latencyMs = Math.round(performance.now() - startTime);
        this.executingRequest.set(false);
        let errorBody = err.error || err.message;
        try {
          if (typeof errorBody === 'string') {
            errorBody = JSON.stringify(JSON.parse(errorBody), null, 2);
          } else {
            errorBody = JSON.stringify(errorBody, null, 2);
          }
        } catch {}

        this.responseResult.set({
          status: err.status || 500,
          statusText: err.statusText || 'Error',
          latencyMs,
          timestamp: new Date(),
          body: errorBody
        });
      }
    });
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.consoleMessage.set('Comando copiado al portapapeles.');
      this.isError.set(false);
    });
  }
}
