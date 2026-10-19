import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="login-brand">
          <div class="brand-badge">
            <i class="ph ph-package"></i>
          </div>
          <h2>Iniciar Sesión en Pedidos360</h2>
          <p class="brand-desc">Accede a tu cuenta de cliente o ingresa al portal de colaboradores.</p>
        </div>

        <div class="auth-tabs-nav">
          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab === 'COGNITO'"
            (click)="activeTab = 'COGNITO'">
            <i class="ph ph-user"></i>
            <span>Clientes</span>
          </button>
          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab === 'AZURE'"
            (click)="activeTab = 'AZURE'">
            <i class="ph ph-buildings"></i>
            <span>Colaboradores</span>
          </button>
        </div>

        <!-- TAB 1: CLIENTES (AWS COGNITO) -->
        <div class="tab-content" *ngIf="activeTab === 'COGNITO'">
          <div class="auth-panel">
            <div class="auth-panel-header">
              <h3>
                {{ isConfirmCodeMode
                    ? 'Verificar Correo Electrónico'
                    : (isRegisterMode ? 'Crear Cuenta de Cliente' : 'Ingreso de Clientes') }}
              </h3>
              <p>
                {{ isConfirmCodeMode
                    ? 'Ingresa el código de 6 dígitos que enviamos a tu correo electrónico.'
                    : (isRegisterMode
                        ? 'Completa tus datos para comprar y hacer seguimiento de tus pedidos.'
                        : 'Ingresa con tu correo electrónico o continúa con el portal seguro.') }}
              </p>
            </div>

            <!-- Confirmación de código -->
            <form class="auth-form" *ngIf="isConfirmCodeMode" (ngSubmit)="handleCognitoConfirmCode()">
              <div class="form-field">
                <label>Correo Electrónico</label>
                <input
                  type="email"
                  class="form-input"
                  [(ngModel)]="clientEmail"
                  name="confirmEmail"
                  placeholder="nombre@correo.cl"
                  required />
              </div>

              <div class="form-field">
                <label>Código de Verificación</label>
                <input
                  type="text"
                  class="form-input"
                  [(ngModel)]="confirmationCode"
                  name="confirmationCode"
                  placeholder="123456"
                  required />
              </div>

              <div class="alert-banner error" *ngIf="cognitoErrorMessage">
                <span><i class="ph ph-warning-circle"></i> {{ cognitoErrorMessage }}</span>
              </div>

              <div class="alert-banner success" *ngIf="cognitoSuccessMessage">
                <span><i class="ph ph-check-circle"></i> {{ cognitoSuccessMessage }}</span>
              </div>

              <button type="submit" class="btn btn-primary btn-full" [disabled]="isLoadingCognito">
                <i class="ph ph-spinner ph-spin" *ngIf="isLoadingCognito"></i>
                <span>Confirmar Cuenta</span>
              </button>

              <div class="auth-switch-row">
                <button type="button" class="link-btn" (click)="isConfirmCodeMode = false">
                  Volver al inicio de sesión
                </button>
              </div>
            </form>

            <!-- Login / Registro de Clientes -->
            <form class="auth-form" *ngIf="!isConfirmCodeMode" (ngSubmit)="handleCognitoSubmit()">
              <div class="form-field" *ngIf="isRegisterMode">
                <label>Nombre y Apellido</label>
                <input
                  type="text"
                  class="form-input"
                  [(ngModel)]="clientName"
                  name="clientName"
                  placeholder="Ej. Camila Soto"
                  required />
              </div>

              <div class="form-field">
                <label>Correo Electrónico</label>
                <input
                  type="email"
                  class="form-input"
                  [(ngModel)]="clientEmail"
                  name="clientEmail"
                  placeholder="nombre@correo.cl"
                  required />
              </div>

              <div class="form-field">
                <label>Contraseña</label>
                <input
                  type="password"
                  class="form-input"
                  [(ngModel)]="clientPassword"
                  name="clientPassword"
                  placeholder="Mínimo 8 caracteres"
                  required />
                <div class="password-checklist" *ngIf="isRegisterMode">
                  <span class="check-pill" [class.passed]="hasMinLength">
                    <i class="ph" [class.ph-check]="hasMinLength" [class.ph-x]="!hasMinLength"></i> Mínimo 8 caracteres
                  </span>
                  <span class="check-pill" [class.passed]="hasUpperCase">
                    <i class="ph" [class.ph-check]="hasUpperCase" [class.ph-x]="!hasUpperCase"></i> 1 Mayúscula
                  </span>
                  <span class="check-pill" [class.passed]="hasLowerCase">
                    <i class="ph" [class.ph-check]="hasLowerCase" [class.ph-x]="!hasLowerCase"></i> 1 Minúscula
                  </span>
                  <span class="check-pill" [class.passed]="hasNumber">
                    <i class="ph" [class.ph-check]="hasNumber" [class.ph-x]="!hasNumber"></i> 1 Número
                  </span>
                  <span class="check-pill" [class.passed]="hasSymbol">
                    <i class="ph" [class.ph-check]="hasSymbol" [class.ph-x]="!hasSymbol"></i> 1 Símbolo (!@#$)
                  </span>
                </div>
              </div>

              <div class="alert-banner error" *ngIf="cognitoErrorMessage">
                <span><i class="ph ph-warning-circle"></i> {{ cognitoErrorMessage }}</span>
              </div>

              <div class="alert-banner success" *ngIf="cognitoSuccessMessage">
                <span><i class="ph ph-check-circle"></i> {{ cognitoSuccessMessage }}</span>
              </div>

              <button type="submit" class="btn btn-primary btn-full" [disabled]="isLoadingCognito">
                <i class="ph ph-spinner ph-spin" *ngIf="isLoadingCognito"></i>
                <span>{{ isRegisterMode ? 'Crear Cuenta' : 'Iniciar Sesión' }}</span>
              </button>

              <button
                *ngIf="authService.cognitoConfig().domain"
                type="button"
                class="btn btn-outline btn-full"
                [disabled]="isLoadingCognito"
                (click)="loginWithCognitoHostedUi()">
                <i class="ph ph-shield-check"></i>
                <span>Continuar con Portal Seguro (SSO)</span>
              </button>

              <div class="auth-switch-row">
                <span>{{ isRegisterMode ? '¿Ya tienes cuenta?' : '¿Eres nuevo en Pedidos360?' }}</span>
                <button type="button" class="link-btn" (click)="toggleCognitoMode()">
                  {{ isRegisterMode ? 'Inicia sesión' : 'Crear una cuenta' }}
                </button>
              </div>
            </form>

            <!-- Configuración de conexión solo cuando el User Pool aún no está inyectado -->
            <details class="conn-details" *ngIf="!authService.isCognitoConfigured()">
              <summary><i class="ph ph-Sliders"></i> Configurar conexión de proveedor de clientes</summary>
              <div class="conn-body">
                <div class="form-field">
                  <label>Client ID</label>
                  <input type="text" class="form-input" [(ngModel)]="cfgClientId" name="cfgClientId" placeholder="App Client ID" />
                </div>
                <div class="form-field">
                  <label>Dominio Hosted UI (opcional)</label>
                  <input type="text" class="form-input" [(ngModel)]="cfgDomain" name="cfgDomain" placeholder="https://dominio.auth.us-east-1.amazoncognito.com" />
                </div>
                <div class="form-grid-2">
                  <div class="form-field">
                    <label>Región</label>
                    <input type="text" class="form-input" [(ngModel)]="cfgRegion" name="cfgRegion" placeholder="us-east-1" />
                  </div>
                  <div class="form-field">
                    <label>User Pool ID</label>
                    <input type="text" class="form-input" [(ngModel)]="cfgUserPoolId" name="cfgUserPoolId" placeholder="us-east-1_XXXX" />
                  </div>
                </div>
                <button type="button" class="btn btn-outline btn-sm" (click)="saveCognitoParameters()">
                  Guardar conexión
                </button>
              </div>
            </details>
          </div>
        </div>

        <!-- TAB 2: COLABORADORES (MICROSOFT ENTRA ID) -->
        <div class="tab-content" *ngIf="activeTab === 'AZURE'">
          <div class="auth-panel">
            <div class="auth-panel-header">
              <h3>Acceso Corporativo</h3>
              <p>Exclusivo para personal de Administración y Despacho Logístico con cuenta institucional Microsoft.</p>
            </div>

            <div class="security-badge-card">
              <div class="badge-icon">
                <i class="ph ph-shield-check"></i>
              </div>
              <div class="badge-body">
                <strong>Verificación en dos pasos (2FA)</strong>
                <p>El inicio de sesión interactivo abrirá el portal de Microsoft y requerirá confirmación en tu teléfono móvil con <strong>Microsoft Authenticator</strong>.</p>
              </div>
            </div>

            <button
              type="button"
              class="btn btn-blue btn-full"
              style="margin-top: 18px;"
              [disabled]="isLoadingAzure"
              (click)="loginWithAzure()">
              <i class="ph ph-windows-logo" *ngIf="!isLoadingAzure"></i>
              <i class="ph ph-spinner ph-spin" *ngIf="isLoadingAzure"></i>
              <span>{{ isLoadingAzure ? 'Conectando con Microsoft...' : 'Continuar con Cuenta Corporativa Microsoft' }}</span>
            </button>

            <div class="alert-banner error" *ngIf="azureErrorMessage" style="margin-top: 14px; margin-bottom: 0;">
              <span><i class="ph ph-warning-circle"></i> {{ azureErrorMessage }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: calc(100vh - 70px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 20px;
      background: var(--corp-50);
    }
    .login-card {
      width: 100%;
      max-width: 440px;
      background: var(--surface-white);
      border: 1px solid var(--corp-200);
      border-radius: var(--radius-lg);
      padding: 32px 28px;
      box-shadow: var(--shadow-card);
    }
    .login-brand {
      text-align: center;
      margin-bottom: 24px;
    }
    .brand-badge {
      width: 48px;
      height: 48px;
      margin: 0 auto 12px;
      border-radius: var(--radius-md);
      background: var(--corp-900);
      color: var(--surface-white);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }
    .login-brand h2 {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--corp-900);
      letter-spacing: -0.02em;
    }
    .brand-desc {
      margin-top: 4px;
      font-size: 0.86rem;
      color: var(--corp-500);
    }
    .auth-tabs-nav {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      background: var(--corp-100);
      padding: 4px;
      border-radius: var(--radius-md);
      margin-bottom: 22px;
    }
    .tab-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 9px 12px;
      border-radius: var(--radius-sm);
      font-size: 0.84rem;
      font-weight: 700;
      color: var(--corp-600);
    }
    .tab-btn.active {
      background: var(--surface-white);
      color: var(--corp-900);
      box-shadow: var(--shadow-subtle);
    }
    .auth-panel-header {
      margin-bottom: 18px;
    }
    .auth-panel-header h3 {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--corp-900);
      margin-bottom: 4px;
    }
    .auth-panel-header p {
      font-size: 0.84rem;
      color: var(--corp-600);
    }
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .password-checklist {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 8px 10px;
      background: var(--corp-50, #f8fafc);
      border: 1px solid var(--corp-200, #e2e8f0);
      border-radius: 8px;
      margin-top: 6px;
    }
    .check-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.74rem;
      padding: 2px 7px;
      border-radius: 12px;
      background: #f1f5f9;
      color: #64748b;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    .check-pill.passed {
      background: #dcfce7;
      color: #15803d;
      font-weight: 600;
    }
    .btn-full {
      width: 100%;
      padding: 11px 16px;
    }
    .auth-switch-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 0.84rem;
      color: var(--corp-600);
      padding-top: 4px;
    }
    .link-btn {
      font-weight: 700;
      color: var(--brand-blue);
      font-size: 0.84rem;
    }
    .link-btn:hover {
      text-decoration: underline;
    }
    .conn-details {
      margin-top: 18px;
      padding-top: 14px;
      border-top: 1px solid var(--corp-200);
      font-size: 0.8rem;
      color: var(--corp-600);
    }
    .conn-details summary {
      cursor: pointer;
      font-weight: 600;
    }
    .conn-body {
      margin-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .security-badge-card {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      padding: 12px 14px;
      background: var(--corp-50);
      border: 1px solid var(--corp-200);
      border-radius: var(--radius-md);
      margin-top: 14px;
    }
    .security-badge-card .badge-icon {
      font-size: 24px;
      color: #0078d4;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .security-badge-card .badge-body strong {
      display: block;
      font-size: 0.88rem;
      color: var(--corp-900);
      font-weight: 700;
      margin-bottom: 2px;
    }
    .security-badge-card .badge-body p {
      font-size: 0.8rem;
      color: var(--corp-600);
      line-height: 1.35;
      margin: 0;
    }
  `]
})
export class LoginComponent implements OnInit {
  activeTab: 'AZURE' | 'COGNITO' = 'COGNITO';

  isRegisterMode = false;
  isConfirmCodeMode = false;
  clientName = '';
  clientEmail = '';
  clientPassword = '';
  confirmationCode = '';

  cfgClientId = '';
  cfgDomain = '';
  cfgRegion = 'us-east-1';
  cfgUserPoolId = '';

  isLoadingAzure = false;
  isLoadingCognito = false;
  azureErrorMessage = '';
  cognitoErrorMessage = '';
  cognitoSuccessMessage = '';

  private returnUrl: string | null = null;

  get hasMinLength(): boolean {
    return (this.clientPassword || '').length >= 8;
  }
  get hasUpperCase(): boolean {
    return /[A-Z]/.test(this.clientPassword || '');
  }
  get hasLowerCase(): boolean {
    return /[a-z]/.test(this.clientPassword || '');
  }
  get hasNumber(): boolean {
    return /[0-9]/.test(this.clientPassword || '');
  }
  get hasSymbol(): boolean {
    return /[^A-Za-z0-9]/.test(this.clientPassword || '');
  }
  get isPasswordValid(): boolean {
    return this.hasMinLength && this.hasUpperCase && this.hasLowerCase && this.hasNumber && this.hasSymbol;
  }

  constructor(
    public authService: AuthService,
    private cartService: CartService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  private formatCognitoError(err: any): string {
    const raw = err?.message || err?.error || '';
    const lower = raw.toLowerCase();
    if (lower.includes('user_password_auth') || lower.includes('flow not enabled')) {
      return 'Falta habilitar "ALLOW_USER_PASSWORD_AUTH" en el App Client de AWS Cognito (consola de AWS).';
    }
    if (lower.includes('usernotfoundexception') || lower.includes('user does not exist')) {
      return 'No encontramos ninguna cuenta con este correo. Haz clic abajo en "¿Eres nuevo? Crear una cuenta" para registrarte.';
    }
    if (lower.includes('notauthorizedexception') || lower.includes('incorrect username or password')) {
      return 'Correo o contraseña incorrectos. Si aún no te has registrado, haz clic abajo en "Crear una cuenta".';
    }
    if (lower.includes('invalidpasswordexception') || lower.includes('password did not conform')) {
      return 'La contraseña debe tener mínimo 8 caracteres, mayúsculas, minúsculas, números y símbolos.';
    }
    if (lower.includes('usernameexistsexception') || lower.includes('user already exists')) {
      return 'Ya existe una cuenta registrada con este correo. Cambia abajo a "Inicia sesión" para ingresar con tu contraseña.';
    }
    if (lower.includes('user not confirmed') || lower.includes('usernotconfirmedexception')) {
      return 'Esta cuenta aún no ha sido verificada. Ingresa el código que enviamos a tu correo.';
    }
    if (lower.includes('limitexceededexception') || lower.includes('too many requests')) {
      return 'Demasiados intentos fallidos. Por seguridad, espera unos minutos antes de reintentar.';
    }
    if (lower.includes('code mismatch') || lower.includes('expiredcodeexception') || lower.includes('invalid verification code')) {
      return 'El código de verificación ingresado no es válido o ya expiró.';
    }
    return raw || 'Error al conectar con el servicio de autenticación.';
  }

  async ngOnInit(): Promise<void> {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || null;
    const cfg = this.authService.cognitoConfig();
    this.cfgClientId = cfg.clientId;
    this.cfgDomain = cfg.domain;
    this.cfgRegion = cfg.region || 'us-east-1';
    this.cfgUserPoolId = cfg.userPoolId;

    const oauthCode = this.route.snapshot.queryParams['code'];
    if (oauthCode) {
      this.activeTab = 'COGNITO';
      this.isLoadingCognito = true;
      this.cognitoErrorMessage = '';
      try {
        await this.authService.exchangeCognitoCode(oauthCode);
        this.redirectByRole();
        return;
      } catch (err: any) {
        this.cognitoErrorMessage = this.formatCognitoError(err);
      } finally {
        this.isLoadingCognito = false;
        this.cdr.detectChanges();
      }
    }

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
      console.error('Error en autenticación corporativa con Azure:', err);
      this.azureErrorMessage = err?.message || 'No se pudo completar la autenticación corporativa.';
    } finally {
      this.isLoadingAzure = false;
      this.cdr.detectChanges();
    }
  }

  async loginWithCognitoHostedUi(): Promise<void> {
    try {
      this.isLoadingCognito = true;
      this.cognitoErrorMessage = '';
      await this.authService.loginWithCognitoHostedUi();
    } catch (err: any) {
      this.cognitoErrorMessage = this.formatCognitoError(err);
      this.isLoadingCognito = false;
      this.cdr.detectChanges();
    }
  }

  async handleCognitoSubmit(): Promise<void> {
    if (!this.clientEmail || !this.clientPassword) {
      this.cognitoErrorMessage = 'Por favor completa tu correo y contraseña.';
      return;
    }

    this.isLoadingCognito = true;
    this.cognitoErrorMessage = '';
    this.cognitoSuccessMessage = '';

    try {
      if (this.isRegisterMode) {
        const result = await this.authService.registerWithCognito(
          this.clientName,
          this.clientEmail,
          this.clientPassword
        );
        if (result.userConfirmed) {
          await this.authService.loginWithCognitoCredentials(this.clientEmail, this.clientPassword);
          this.redirectByRole();
        } else {
          this.isConfirmCodeMode = true;
          this.cognitoSuccessMessage = 'Cuenta creada. Ingresa el código enviado a tu correo.';
        }
      } else {
        await this.authService.loginWithCognitoCredentials(this.clientEmail, this.clientPassword);
        this.redirectByRole();
      }
    } catch (err: any) {
      this.cognitoErrorMessage = this.formatCognitoError(err);
    } finally {
      this.isLoadingCognito = false;
      this.cdr.detectChanges();
    }
  }

  async handleCognitoConfirmCode(): Promise<void> {
    if (!this.clientEmail || !this.confirmationCode) {
      this.cognitoErrorMessage = 'Ingresa tu correo y el código de verificación.';
      return;
    }

    this.isLoadingCognito = true;
    this.cognitoErrorMessage = '';
    try {
      await this.authService.confirmCognitoRegistration(this.clientEmail, this.confirmationCode);
      this.isConfirmCodeMode = false;
      this.isRegisterMode = false;
      if (this.clientPassword) {
        await this.authService.loginWithCognitoCredentials(this.clientEmail, this.clientPassword);
        this.redirectByRole();
      } else {
        this.cognitoSuccessMessage = 'Correo verificado. Ya puedes iniciar sesión.';
      }
    } catch (err: any) {
      this.cognitoErrorMessage = this.formatCognitoError(err);
    } finally {
      this.isLoadingCognito = false;
      this.cdr.detectChanges();
    }
  }

  toggleCognitoMode(): void {
    this.isRegisterMode = !this.isRegisterMode;
    this.cognitoErrorMessage = '';
    this.cognitoSuccessMessage = '';
  }

  saveCognitoParameters(): void {
    this.authService.saveCognitoRuntimeConfig({
      clientId: this.cfgClientId,
      domain: this.cfgDomain,
      region: this.cfgRegion,
      userPoolId: this.cfgUserPoolId
    });
    this.cognitoErrorMessage = '';
    this.cognitoSuccessMessage = 'Configuración guardada correctamente.';
  }

  redirectByRole(): void {
    if (this.authService.isAdmin()) {
      this.router.navigate(['/home']);
    } else if (this.authService.isDespachador()) {
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
