import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService, UserProfile } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page">
      <div class="login-container">
        <!-- Logo & Header -->
        <div class="login-brand">
          <div class="brand-badge">
            <i class="ph ph-cube-transparent"></i>
          </div>
          <h2>Pedidos360</h2>
          <p class="brand-desc">Portal de Autenticación & Control de Acceso</p>
        </div>

        <!-- Selector de Pestañas: Corporativo (Azure) vs Clientes (Cognito) -->
        <div class="auth-tabs-nav">
          <button 
            type="button" 
            class="tab-btn" 
            [class.active]="activeTab === 'AZURE'" 
            (click)="activeTab = 'AZURE'">
            <i class="ph ph-windows-logo"></i>
            <span>Colaboradores (Azure)</span>
          </button>
          <button 
            type="button" 
            class="tab-btn" 
            [class.active]="activeTab === 'COGNITO'" 
            (click)="activeTab = 'COGNITO'">
            <i class="ph ph-shopping-bag"></i>
            <span>Clientes (Cognito)</span>
          </button>
        </div>

        <!-- ===================================================================
             PESTAÑA 1: COLABORADORES (MICROSOFT ENTRA ID)
             =================================================================== -->
        <div class="tab-content" *ngIf="activeTab === 'AZURE'">
          <div class="azure-hero-box">
            <div class="azure-hero-header">
              <span class="auth-pill-badge">
                <i class="ph ph-shield-check"></i> SINGLE SIGN-ON EMPRESARIAL
              </span>
              <h3>Acceso Institucional</h3>
              <p>Inicia sesión con tu cuenta corporativa para validar tus permisos en Microsoft Entra ID.</p>
            </div>

            <!-- Cuentas registradas en el Tenant -->
            <div class="accounts-preview-card">
              <span class="accounts-title">ROLES CONFIGURADOS EN EL TENANT:</span>
              <div class="account-item">
                <span class="account-badge admin"><i class="ph ph-crown"></i> Administrador</span>
                <span class="account-email">hector.aguila&#64;josecamposar.onmicrosoft.com</span>
              </div>
              <div class="account-item">
                <span class="account-badge despachador"><i class="ph ph-truck"></i> Despachador</span>
                <span class="account-email">despacho_aguila&#64;josecamposar.onmicrosoft.com</span>
              </div>
            </div>

            <!-- Botón Principal Azure Entra ID -->
            <button 
              type="button" 
              class="btn-azure-main" 
              [disabled]="isLoadingAzure" 
              (click)="loginWithAzure()">
              <i class="ph ph-windows-logo" *ngIf="!isLoadingAzure"></i>
              <i class="ph ph-spinner ph-spin" *ngIf="isLoadingAzure"></i>
              <span>{{ isLoadingAzure ? 'Autenticando con Microsoft...' : 'Iniciar Sesión con Microsoft' }}</span>
            </button>

            <div class="auth-error-msg" *ngIf="azureErrorMessage">
              <i class="ph ph-warning-circle"></i>
              <span>{{ azureErrorMessage }}</span>
            </div>

            <!-- Simulador Offline / Pruebas Rápidas -->
            <details class="dev-collapsible">
              <summary><i class="ph ph-caret-right"></i> Acceso Rápido de Prueba (Sin Popups)</summary>
              <div class="dev-box-inner">
                <button type="button" class="btn-dev-role" (click)="loginAsMock('ADMIN')">
                  <i class="ph ph-crown"></i> Admin: Héctor Águila
                </button>
                <button type="button" class="btn-dev-role" (click)="loginAsMock('DESPACHADOR')">
                  <i class="ph ph-truck"></i> Despachador: Operario Despacho
                </button>
              </div>
            </details>
          </div>
        </div>

        <!-- ===================================================================
             PESTAÑA 2: CLIENTES TIENDA (AWS COGNITO)
             =================================================================== -->
        <div class="tab-content" *ngIf="activeTab === 'COGNITO'">
          <div class="cognito-box">
            <div class="cognito-header">
              <span class="cognito-pill-badge">
                <i class="ph ph-amazon-logo"></i> AWS COGNITO USER POOL
              </span>
              <h3>{{ isRegisterMode ? 'Crear Cuenta de Cliente' : 'Bienvenido a la Tienda' }}</h3>
              <p>
                {{ isRegisterMode 
                  ? 'Regístrate para guardar tus pedidos y gestionar direcciones.' 
                  : 'Ingresa tus credenciales de cliente para finalizar tus compras.' }}
              </p>
            </div>

            <form class="cognito-form" (ngSubmit)="handleCognitoSubmit()">
              <!-- Campo Nombre (Solo en Registro) -->
              <div class="form-group" *ngIf="isRegisterMode">
                <label>Nombre y Apellido</label>
                <div class="input-with-icon">
                  <i class="ph ph-user"></i>
                  <input 
                    type="text" 
                    [(ngModel)]="clientName" 
                    name="clientName" 
                    placeholder="Ej. Juan Pérez" 
                    required />
                </div>
              </div>

              <!-- Campo Email -->
              <div class="form-group">
                <label>Correo Electrónico</label>
                <div class="input-with-icon">
                  <i class="ph ph-envelope-simple"></i>
                  <input 
                    type="email" 
                    [(ngModel)]="clientEmail" 
                    name="clientEmail" 
                    placeholder="cliente@ejemplo.com" 
                    required />
                </div>
              </div>

              <!-- Campo Contraseña -->
              <div class="form-group">
                <label>Contraseña</label>
                <div class="input-with-icon">
                  <i class="ph ph-lock-key"></i>
                  <input 
                    type="password" 
                    [(ngModel)]="clientPassword" 
                    name="clientPassword" 
                    placeholder="••••••••" 
                    required />
                </div>
              </div>

              <div class="auth-error-msg" *ngIf="cognitoErrorMessage">
                <i class="ph ph-warning-circle"></i>
                <span>{{ cognitoErrorMessage }}</span>
              </div>

              <!-- Botón Submit -->
              <button 
                type="submit" 
                class="btn-cognito-submit" 
                [disabled]="isLoadingCognito">
                <i class="ph ph-spinner ph-spin" *ngIf="isLoadingCognito"></i>
                <i class="ph ph-arrow-right" *ngIf="!isLoadingCognito"></i>
                <span>{{ isRegisterMode ? 'Registrarme e Ingresar' : 'Iniciar Sesión como Cliente' }}</span>
              </button>

              <!-- Switch entre Login y Registro -->
              <div class="toggle-register-box">
                <span *ngIf="!isRegisterMode">¿No tienes cuenta aún?</span>
                <span *ngIf="isRegisterMode">¿Ya tienes una cuenta?</span>
                <button 
                  type="button" 
                  class="btn-text-toggle" 
                  (click)="isRegisterMode = !isRegisterMode">
                  {{ isRegisterMode ? 'Inicia sesión aquí' : 'Crea tu cuenta aquí' }}
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Arquitectura & Especificaciones Técnicas -->
        <div class="specs-summary">
          <div class="spec-row">
            <i class="ph ph-fingerprint"></i>
            <span>IDaaS Corporativo: <strong>Microsoft Entra ID (OIDC / PKCE)</strong></span>
          </div>
          <div class="spec-row">
            <i class="ph ph-shield-check"></i>
            <span>IDaaS Clientes: <strong>AWS Cognito User Pool</strong></span>
          </div>
          <div class="spec-row">
            <i class="ph ph-git-fork"></i>
            <span>Control RBAC: <strong>Administrador, Despachador, Usuario</strong></span>
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
      padding: 32px 20px;
    }
    .login-container {
      width: 100%;
      max-width: 500px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 36px 32px;
      box-shadow: 0 12px 30px -8px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.04);
    }
    .login-brand {
      text-align: center;
      margin-bottom: 24px;
    }
    .brand-badge {
      width: 54px;
      height: 54px;
      margin: 0 auto 12px auto;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #38bdf8;
      font-size: 1.8rem;
      box-shadow: 0 6px 16px rgba(15, 23, 42, 0.2);
    }
    .login-brand h2 {
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      margin: 0 0 4px 0;
    }
    .brand-desc {
      color: #64748b;
      font-size: 0.85rem;
      margin: 0;
    }

    /* Tabs Nav */
    .auth-tabs-nav {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      background: #f1f5f9;
      padding: 4px;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .tab-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: 9px;
      border: none;
      background: transparent;
      color: #64748b;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .tab-btn i {
      font-size: 1.1rem;
    }
    .tab-btn.active {
      background: #ffffff;
      color: #0f172a;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
    }

    /* Content Area */
    .tab-content {
      margin-bottom: 24px;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Azure Box */
    .azure-hero-box {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .auth-pill-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.68rem;
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
      margin: 0 0 6px 0;
    }
    .azure-hero-header p {
      font-size: 0.84rem;
      color: #64748b;
      line-height: 1.45;
      margin: 0;
    }
    .accounts-preview-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .accounts-title {
      font-size: 0.68rem;
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
      gap: 5px;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 3px 10px;
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
      font-size: 0.76rem;
      color: #334155;
      font-family: monospace;
    }
    .btn-azure-main {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: #0f172a;
      color: #ffffff;
      padding: 13px 20px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 0.94rem;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
      transition: all 0.2s ease;
    }
    .btn-azure-main:hover:not(:disabled) {
      background: #1e293b;
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(15, 23, 42, 0.25);
    }
    .btn-azure-main:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    /* Cognito Box */
    .cognito-box {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .cognito-pill-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.68rem;
      font-weight: 800;
      color: #ea580c;
      background: #ffedd5;
      padding: 4px 10px;
      border-radius: 9999px;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .cognito-header h3 {
      font-size: 1.15rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px 0;
    }
    .cognito-header p {
      font-size: 0.84rem;
      color: #64748b;
      line-height: 1.45;
      margin: 0;
    }
    .cognito-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-group label {
      font-size: 0.78rem;
      font-weight: 700;
      color: #334155;
    }
    .input-with-icon {
      position: relative;
      display: flex;
      align-items: center;
    }
    .input-with-icon i {
      position: absolute;
      left: 12px;
      color: #94a3b8;
      font-size: 1.1rem;
    }
    .input-with-icon input {
      width: 100%;
      padding: 10px 14px 10px 38px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      font-size: 0.88rem;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      transition: border-color 0.2s;
    }
    .input-with-icon input:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    .btn-cognito-submit {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: #ffffff;
      padding: 12px 18px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 0.92rem;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
      transition: all 0.2s ease;
      margin-top: 4px;
    }
    .btn-cognito-submit:hover:not(:disabled) {
      background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
    }
    .toggle-register-box {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 0.8rem;
      color: #64748b;
      margin-top: 4px;
    }
    .btn-text-toggle {
      background: none;
      border: none;
      color: #2563eb;
      font-weight: 700;
      cursor: pointer;
      padding: 0;
      font-size: 0.8rem;
    }
    .btn-text-toggle:hover {
      text-decoration: underline;
    }

    /* Error Message */
    .auth-error-msg {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 8px;
      background: #fef2f2;
      border: 1px solid #fee2e2;
      color: #dc2626;
      font-size: 0.8rem;
      font-weight: 600;
    }

    /* Dev Collapsible */
    .dev-collapsible {
      margin-top: 8px;
      border: 1px dashed #cbd5e1;
      border-radius: 10px;
      padding: 10px 14px;
      background: #fafafa;
    }
    .dev-collapsible summary {
      font-size: 0.78rem;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
      user-select: none;
    }
    .dev-box-inner {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 10px;
    }
    .btn-dev-role {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      color: #1e293b;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-dev-role:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }

    /* Specs Footer */
    .specs-summary {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 14px 16px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .spec-row {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.78rem;
      color: #475569;
    }
    .spec-row i { color: #2563eb; font-size: 0.95rem; }
    .spec-row strong { color: #0f172a; }
  `]
})
export class LoginComponent implements OnInit {
  activeTab: 'AZURE' | 'COGNITO' = 'AZURE';

  // Azure State
  isLoadingAzure = false;
  azureErrorMessage = '';

  // Cognito State
  isRegisterMode = false;
  isLoadingCognito = false;
  cognitoErrorMessage = '';
  clientName = '';
  clientEmail = '';
  clientPassword = '';

  private returnUrl: string | null = null;

  constructor(
    public authService: AuthService,
    private cartService: CartService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || null;

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

  handleCognitoSubmit(): void {
    if (!this.clientEmail || !this.clientPassword) {
      this.cognitoErrorMessage = 'Por favor completa tu correo y contraseña.';
      return;
    }

    this.isLoadingCognito = true;
    this.cognitoErrorMessage = '';

    // Simulación de autenticación exitosa con AWS Cognito User Pool
    setTimeout(() => {
      const displayName = this.clientName.trim() || this.clientEmail.split('@')[0];
      const cognitoUser: UserProfile = {
        name: displayName,
        username: this.clientEmail,
        roles: ['Usuario', 'Cliente'],
        scopes: ['pedidos.read', 'pedidos.write']
      };

      const mockCognitoToken = `cognito-jwt-${Date.now()}`;
      localStorage.setItem('p360_user', JSON.stringify(cognitoUser));
      localStorage.setItem('p360_token', mockCognitoToken);

      (this.authService as any).userSignal.set(cognitoUser);
      (this.authService as any).tokenSignal.set(mockCognitoToken);

      this.isLoadingCognito = false;
      this.redirectByRole();
    }, 600);
  }

  loginAsMock(role: 'ADMIN' | 'DESPACHADOR'): void {
    if (role === 'DESPACHADOR') {
      const devDespachador: UserProfile = {
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
      const devAdmin: UserProfile = {
        name: 'Héctor Águila',
        username: 'hector.aguila@josecamposar.onmicrosoft.com',
        roles: ['Administrador', 'ADMIN'],
        scopes: ['pedidos.read', 'pedidos.write', 'productos.write', 'envios.write']
      };
      localStorage.setItem('p360_user', JSON.stringify(devAdmin));
      localStorage.setItem('p360_token', `mock-jwt-admin-${Date.now()}`);
      (this.authService as any).userSignal.set(devAdmin);
      (this.authService as any).tokenSignal.set(`mock-jwt-admin-${Date.now()}`);
      this.router.navigate(['/productos']);
    }
  }

  redirectByRole(): void {
    if (this.authService.isDespachador()) {
      this.router.navigate(['/tracking']);
    } else if (this.returnUrl === 'checkout') {
      this.router.navigate(['/productos']).then(() => {
        this.cartService.openDrawer();
      });
    } else {
      this.router.navigate(['/productos']);
    }
  }
}
