import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="auth-card">
      <div class="auth-header">
        <div class="badge">Autenticación IDaaS</div>
        <h2>Acceso a Pedidos360</h2>
        <p class="subtitle">Plataforma Cloud Native con Microsoft Entra ID y OAuth 2.0</p>
      </div>

      <div class="mode-info" *ngIf="!authService.isMsalConfigured">
        <span class="dot"></span>
        <span>Modo Desarrollo Local activo (sin conexión a tenant Azure)</span>
      </div>

      <div class="login-actions">
        <button class="btn btn-primary" (click)="loginAs('ADMIN')">
          <span class="icon">👑</span> Iniciar como Administrador (ROLE_ADMIN)
        </button>
        <button class="btn btn-secondary" (click)="loginAs('USER')">
          <span class="icon">👤</span> Iniciar como Operador (ROLE_USER)
        </button>
      </div>

      <div class="tech-card" *ngIf="authService.isMsalConfigured">
        <button class="btn btn-azure" (click)="authService.login()">
          Iniciar sesión con Microsoft Entra ID
        </button>
      </div>

      <div class="scopes-card">
        <h4>Scopes y Flujo de la Evaluación</h4>
        <ul>
          <li><strong>Protocolo:</strong> Authorization Code Flow + PKCE</li>
          <li><strong>IDaaS:</strong> Microsoft Entra ID (Azure AD)</li>
          <li><strong>Scopes:</strong> pedidos.read, pedidos.write, productos.read, productos.write</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .auth-card {
      max-width: 480px;
      margin: 40px auto;
      padding: 32px;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      border: 1px solid #e2e8f0;
    }
    .auth-header h2 {
      margin: 12px 0 6px 0;
      color: #0f172a;
      font-size: 1.6rem;
    }
    .subtitle {
      color: #64748b;
      font-size: 0.9rem;
      margin-bottom: 24px;
    }
    .badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: 20px;
      background: #e0f2fe;
      color: #0284c7;
    }
    .mode-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      color: #059669;
      background: #ecfdf5;
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 20px;
      border: 1px solid #a7f3d0;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
    }
    .login-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 12px 18px;
      font-size: 0.95rem;
      font-weight: 600;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-primary {
      background: #2563eb;
      color: white;
    }
    .btn-primary:hover {
      background: #1d4ed8;
      transform: translateY(-1px);
    }
    .btn-secondary {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
    }
    .btn-secondary:hover {
      background: #e2e8f0;
    }
    .btn-azure {
      background: #0078d4;
      color: white;
      width: 100%;
    }
    .scopes-card {
      background: #f8fafc;
      padding: 16px;
      border-radius: 10px;
      border: 1px solid #f1f5f9;
      font-size: 0.85rem;
    }
    .scopes-card h4 {
      margin: 0 0 10px 0;
      color: #334155;
    }
    .scopes-card ul {
      margin: 0;
      padding-left: 18px;
      color: #64748b;
    }
    .scopes-card li {
      margin-bottom: 6px;
    }
  `]
})
export class LoginComponent {
  constructor(public authService: AuthService, private router: Router) {}

  loginAs(role: 'USER' | 'ADMIN'): void {
    this.authService.loginAsDevUser(role);
    this.router.navigate(['/home']);
  }
}
