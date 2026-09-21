import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login-page">
      <div class="login-container">
        <!-- Logo & Header -->
        <div class="login-brand">
          <div class="brand-badge">
            <i class="ph ph-cube-transparent"></i>
          </div>
          <h2>Pedidos360 CRM</h2>
          <p class="brand-desc">Portal de Gestión y Arquitectura Cloud Native</p>
        </div>

        <!-- Mode Card -->
        <div class="mode-notice" *ngIf="!authService.isMsalConfigured">
          <i class="ph ph-wrench"></i>
          <div>
            <strong>Entorno de Desarrollo Local</strong>
            <p>Conexión directa a PostgreSQL y microservicios sin dependencia de Azure Entra ID</p>
          </div>
        </div>

        <!-- Quick Access Roles -->
        <div class="auth-box">
          <span class="auth-box-title">SELECCIONÁ UN ROL PARA INGRESAR</span>
          
          <button class="btn-role btn-admin" (click)="loginAs('ADMIN')">
            <div class="role-icon"><i class="ph ph-crown"></i></div>
            <div class="role-text">
              <strong>Administrador General (ADMIN)</strong>
              <small>Acceso total: Altas, bajas y scopes completos</small>
            </div>
            <i class="ph ph-arrow-right role-arrow"></i>
          </button>

          <button class="btn-role btn-user" (click)="loginAs('USER')">
            <div class="role-icon"><i class="ph ph-user"></i></div>
            <div class="role-text">
              <strong>Operador de Ventas (USER)</strong>
              <small>Lectura y creación de pedidos (sin permisos DELETE)</small>
            </div>
            <i class="ph ph-arrow-right role-arrow"></i>
          </button>
        </div>

        <!-- Microsoft Entra ID Option -->
        <div class="azure-box" *ngIf="authService.isMsalConfigured">
          <button class="btn-azure" (click)="authService.login()">
            <i class="ph ph-shield-check"></i> Iniciar sesión con Microsoft Entra ID
          </button>
        </div>

        <!-- Architecture Specs -->
        <div class="specs-summary">
          <div class="spec-row">
            <i class="ph ph-lock-key"></i>
            <span>Flujo: <strong>Authorization Code + PKCE</strong></span>
          </div>
          <div class="spec-row">
            <i class="ph ph-fingerprint"></i>
            <span>IDaaS: <strong>Microsoft Entra ID</strong></span>
          </div>
          <div class="spec-row">
            <i class="ph ph-key"></i>
            <span>Scopes: <code>pedidos.read</code> <code>pedidos.write</code> <code>productos.read</code></span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: calc(100vh - 120px);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .login-container {
      width: 100%;
      max-width: 460px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 36px 32px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
    }
    .login-brand {
      text-align: center;
      margin-bottom: 24px;
    }
    .brand-badge {
      width: 52px;
      height: 52px;
      margin: 0 auto 14px auto;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.8rem;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
    }
    .login-brand h2 {
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }
    .brand-desc {
      color: #64748b;
      font-size: 0.88rem;
    }
    .mode-notice {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      padding: 12px 14px;
      border-radius: 10px;
      margin-bottom: 24px;
    }
    .mode-notice i {
      font-size: 1.3rem;
      color: #2563eb;
      margin-top: 2px;
    }
    .mode-notice strong {
      display: block;
      font-size: 0.85rem;
      color: #1e40af;
      margin-bottom: 2px;
    }
    .mode-notice p {
      margin: 0;
      font-size: 0.78rem;
      color: #3b82f6;
      line-height: 1.3;
    }
    .auth-box {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }
    .auth-box-title {
      font-size: 0.7rem;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.8px;
      margin-bottom: 4px;
    }
    .btn-role {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      text-align: left;
      transition: all 0.2s;
    }
    .btn-role:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
      border-color: #2563eb;
    }
    .role-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
    }
    .btn-admin .role-icon { background: #fffbeb; color: #d97706; }
    .btn-user .role-icon { background: #eff6ff; color: #2563eb; }
    .role-text { flex: 1; }
    .role-text strong {
      display: block;
      font-size: 0.92rem;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .role-text small {
      display: block;
      font-size: 0.78rem;
      color: #64748b;
    }
    .role-arrow {
      color: #94a3b8;
      font-size: 1.1rem;
    }
    .btn-azure {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 12px;
      background: #0078d4;
      color: white;
      font-weight: 600;
      font-size: 0.9rem;
      border-radius: 10px;
      transition: all 0.2s;
    }
    .btn-azure:hover { background: #106ebe; }
    .specs-summary {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 14px 16px;
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .spec-row {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.8rem;
      color: #475569;
    }
    .spec-row i { color: #2563eb; font-size: 1rem; }
    .spec-row code {
      background: #e2e8f0;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.75rem;
      color: #0f172a;
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
