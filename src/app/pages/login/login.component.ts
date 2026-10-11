import { Component, OnInit } from '@angular/core';
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

        <!-- Microsoft Entra ID Hero Option -->
        <div class="azure-hero-box" *ngIf="authService.isMsalConfigured">
          <div class="azure-hero-header">
            <span class="auth-pill-badge"><i class="ph ph-shield-check"></i> AUTENTICACIÓN EMPRESARIAL</span>
            <h3>Inicio de Sesión Corporativo</h3>
            <p>Accedé con tu cuenta institucional para validar permisos y roles de Microsoft Entra ID.</p>
          </div>

          <div class="accounts-preview-card">
            <span class="accounts-title">CUENTAS CONFIGURADAS EN EL TENANT:</span>
            <div class="account-item">
              <span class="account-badge admin"><i class="ph ph-crown"></i> Administrador</span>
              <span class="account-email">hector.aguila&#64;josecamposar.onmicrosoft.com</span>
            </div>
            <div class="account-item">
              <span class="account-badge despachador"><i class="ph ph-truck"></i> Despachador</span>
              <span class="account-email">despacho_aguila&#64;josecamposar.onmicrosoft.com</span>
            </div>
          </div>

          <button class="btn-azure-main" [disabled]="isLoadingAzure" (click)="loginWithAzure()">
            <i class="ph ph-windows-logo" *ngIf="!isLoadingAzure"></i>
            <i class="ph ph-spinner ph-spin" *ngIf="isLoadingAzure"></i>
            {{ isLoadingAzure ? 'Conectando con Microsoft...' : 'Iniciar sesión con Microsoft Entra ID' }}
          </button>

          <div class="azure-error" *ngIf="azureErrorMessage">
            {{ azureErrorMessage }}
          </div>

          <details class="dev-collapsible">
            <summary>Modo de Prueba Local (Offline)</summary>
            <div class="dev-box-inner">
              <button class="btn-dev-role" (click)="loginAs('ADMIN')">
                <i class="ph ph-crown"></i> Simular Admin
              </button>
              <button class="btn-dev-role" (click)="loginAs('DESPACHADOR')">
                <i class="ph ph-truck"></i> Simular Despachador
              </button>
              <button class="btn-dev-role" (click)="loginAs('USER')">
                <i class="ph ph-user"></i> Simular Cliente
              </button>
            </div>
          </details>
        </div>

        <!-- Modo Local si MSAL no estuviera configurado -->
        <div class="auth-box" *ngIf="!authService.isMsalConfigured">
          <span class="auth-box-title">SELECCIONÁ UN ROL PARA INGRESAR</span>
          
          <button class="btn-role btn-admin" (click)="loginAs('ADMIN')">
            <div class="role-icon"><i class="ph ph-crown"></i></div>
            <div class="role-text">
              <strong>Administrador General (ADMIN)</strong>
              <small>Acceso total: Catálogo, pedidos y compras</small>
            </div>
            <i class="ph ph-arrow-right role-arrow"></i>
          </button>

          <button class="btn-role btn-despachador" (click)="loginAs('DESPACHADOR')">
            <div class="role-icon"><i class="ph ph-truck"></i></div>
            <div class="role-text">
              <strong>Operario de Logística (DESPACHADOR)</strong>
              <small>Panel de tracking y actualización de estados</small>
            </div>
            <i class="ph ph-arrow-right role-arrow"></i>
          </button>

          <button class="btn-role btn-user" (click)="loginAs('USER')">
            <div class="role-icon"><i class="ph ph-user"></i></div>
            <div class="role-text">
              <strong>Cliente / Operador de Ventas (USER)</strong>
              <small>Navegación y compra de productos</small>
            </div>
            <i class="ph ph-arrow-right role-arrow"></i>
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
            <span>IDaaS: <strong>Microsoft Entra ID (Azure AD)</strong></span>
          </div>
          <div class="spec-row">
            <i class="ph ph-shield-check"></i>
            <span>Roles soportados: <strong>Administrador</strong>, <strong>Despachador</strong>, <strong>Usuario</strong></span>
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
      padding: 24px;
    }
    .login-container {
      width: 100%;
      max-width: 480px;
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

    /* Azure Hero Box */
    .azure-hero-box {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px;
    }
    .auth-pill-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.7rem;
      font-weight: 800;
      color: #0284c7;
      background: #e0f2fe;
      padding: 4px 10px;
      border-radius: 9999px;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .azure-hero-header h3 {
      font-size: 1.15rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .azure-hero-header p {
      font-size: 0.82rem;
      color: #64748b;
      line-height: 1.4;
      margin: 0;
    }
    .accounts-preview-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .accounts-title {
      font-size: 0.65rem;
      font-weight: 800;
      color: #94a3b8;
      letter-spacing: 0.5px;
    }
    .account-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .account-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
    }
    .account-badge.admin {
      background: #fef3c7;
      color: #92400e;
    }
    .account-badge.despachador {
      background: #e0f2fe;
      color: #0369a1;
    }
    .account-email {
      font-size: 0.74rem;
      color: #334155;
      font-family: monospace;
    }
    .btn-azure-main {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 14px;
      background: #0078d4;
      color: white;
      font-weight: 700;
      font-size: 0.95rem;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 120, 212, 0.25);
      transition: all 0.2s;
      cursor: pointer;
      border: none;
    }
    .btn-azure-main:hover:not(:disabled) {
      background: #106ebe;
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(0, 120, 212, 0.35);
    }
    .btn-azure-main:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    .azure-error {
      padding: 10px 14px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      color: #b91c1c;
      font-size: 0.8rem;
      line-height: 1.3;
    }

    /* Dev Collapsible */
    .dev-collapsible {
      font-size: 0.75rem;
      color: #94a3b8;
      cursor: pointer;
    }
    .dev-collapsible summary {
      outline: none;
      user-select: none;
    }
    .dev-box-inner {
      margin-top: 8px;
      display: flex;
      gap: 8px;
    }
    .btn-dev-role {
      flex: 1;
      padding: 8px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      font-size: 0.72rem;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .btn-dev-role:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    /* Standard Auth Box */
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
      cursor: pointer;
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
    .btn-despachador .role-icon { background: #e0f2fe; color: #0369a1; }
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
    .spec-row strong { color: #0f172a; }
  `]
})
export class LoginComponent implements OnInit {
  isLoadingAzure = false;
  azureErrorMessage = '';

  constructor(public authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.redirectByRole();
    }
  }

  async loginWithAzure(): Promise<void> {
    try {
      this.isLoadingAzure = true;
      this.azureErrorMessage = '';
      await this.authService.login();
      this.redirectByRole();
    } catch (err: any) {
      this.azureErrorMessage = err?.message || 'Error al autenticar con Microsoft Entra ID';
    } finally {
      this.isLoadingAzure = false;
    }
  }

  redirectByRole(): void {
    if (this.authService.isDespachador()) {
      this.router.navigate(['/tracking']);
    } else {
      this.router.navigate(['/productos']);
    }
  }

  loginAs(role: 'USER' | 'ADMIN' | 'DESPACHADOR'): void {
    if (role === 'DESPACHADOR') {
      const devDespachador = {
        name: 'Operario Despacho',
        username: 'despacho_aguila@josecamposar.onmicrosoft.com',
        roles: ['Despachador'],
        scopes: ['pedidos.read', 'envios.write']
      };
      localStorage.setItem('p360_user', JSON.stringify(devDespachador));
      localStorage.setItem('p360_token', `mock-jwt-despacho-${Date.now()}`);
      (this.authService as any).userSignal.set(devDespachador);
      (this.authService as any).tokenSignal.set(`mock-jwt-despacho-${Date.now()}`);
      this.router.navigate(['/tracking']);
    } else {
      this.authService.loginAsDevUser(role);
      this.redirectByRole();
    }
  }
}
