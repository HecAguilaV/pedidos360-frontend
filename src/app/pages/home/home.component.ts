import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="home-container">
      <div class="welcome-banner">
        <div class="banner-content">
          <h1>Bienvenido a Pedidos360</h1>
          <p>Arquitectura Cloud Native con Microservicios Spring Boot, Angular y Microsoft Entra ID.</p>
        </div>
        <div class="user-chip" *ngIf="authService.currentUser() as user">
          <div class="avatar">{{ user.name.charAt(0) }}</div>
          <div>
            <div class="user-name">{{ user.name }}</div>
            <div class="user-roles">
              <span class="role-badge" *ngFor="let role of user.roles">{{ role }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="grid-cards">
        <div class="card card-productos">
          <div class="card-icon">📦</div>
          <h3>Catálogo de Productos</h3>
          <p>Gestión de productos y control de stock alimentado por el microservicio <code>productos-service:8082</code>.</p>
          <a routerLink="/productos" class="card-link">Ver Productos →</a>
        </div>

        <div class="card card-pedidos">
          <div class="card-icon">🛒</div>
          <h3>Gestión de Pedidos</h3>
          <p>Registro y seguimiento de órdenes de clientes alimentado por el microservicio <code>pedidos-service:8081</code>.</p>
          <a routerLink="/pedidos" class="card-link">Ver Pedidos →</a>
        </div>
      </div>

      <div class="arch-section">
        <h3>Diagrama de Integración Cloud Native</h3>
        <div class="flow-steps">
          <div class="step">
            <span class="step-num">1</span>
            <strong>Angular + MSAL</strong>
            <small>Auth Code + PKCE</small>
          </div>
          <div class="arrow">→</div>
          <div class="step">
            <span class="step-num">2</span>
            <strong>Microsoft Entra ID</strong>
            <small>Emite JWT con Scopes/Roles</small>
          </div>
          <div class="arrow">→</div>
          <div class="step">
            <span class="step-num">3</span>
            <strong>AWS API Gateway</strong>
            <small>HTTP API + JWT Authorizer</small>
          </div>
          <div class="arrow">→</div>
          <div class="step">
            <span class="step-num">4</span>
            <strong>Microservicios (EC2)</strong>
            <small>Spring Boot + JPA</small>
          </div>
          <div class="arrow">→</div>
          <div class="step">
            <span class="step-num">5</span>
            <strong>Amazon RDS</strong>
            <small>PostgreSQL Cloud</small>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      display: flex;
      flex-direction: column;
      gap: 32px;
    }
    .welcome-banner {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      color: white;
      padding: 36px 40px;
      border-radius: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
    }
    .welcome-banner h1 {
      margin: 0 0 8px 0;
      font-size: 2rem;
    }
    .welcome-banner p {
      margin: 0;
      color: #94a3b8;
      font-size: 1.05rem;
    }
    .user-chip {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(8px);
      padding: 12px 20px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 14px;
      border: 1px solid rgba(255,255,255,0.15);
    }
    .avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #3b82f6;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      font-weight: bold;
    }
    .user-name {
      font-weight: 600;
    }
    .role-badge {
      background: #2563eb;
      color: white;
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 4px;
      margin-right: 4px;
    }
    .grid-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 24px;
    }
    .card {
      background: white;
      padding: 28px;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.04);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .card:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 24px rgba(0,0,0,0.08);
    }
    .card-icon {
      font-size: 2rem;
      margin-bottom: 12px;
    }
    .card h3 {
      margin: 0 0 10px 0;
      color: #1e293b;
    }
    .card p {
      color: #64748b;
      margin-bottom: 20px;
      font-size: 0.95rem;
      line-height: 1.5;
    }
    .card code {
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      color: #2563eb;
    }
    .card-link {
      display: inline-block;
      color: #2563eb;
      font-weight: 600;
      text-decoration: none;
    }
    .card-link:hover {
      text-decoration: underline;
    }
    .arch-section {
      background: white;
      padding: 28px;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
    }
    .arch-section h3 {
      margin: 0 0 20px 0;
      color: #1e293b;
    }
    .flow-steps {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }
    .step {
      background: #f8fafc;
      padding: 16px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      text-align: center;
      min-width: 140px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .step-num {
      width: 24px;
      height: 24px;
      margin: 0 auto;
      border-radius: 50%;
      background: #2563eb;
      color: white;
      font-size: 0.8rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
    }
    .step strong {
      font-size: 0.9rem;
      color: #1e293b;
    }
    .step small {
      font-size: 0.75rem;
      color: #64748b;
    }
    .arrow {
      color: #94a3b8;
      font-size: 1.4rem;
    }
  `]
})
export class HomeComponent {
  constructor(public authService: AuthService) {}
}
