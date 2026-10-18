import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { environment } from '../../../environments/environment';

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
          <p class="brand-desc">Portal de Autenticación & Control de Acceso Dual</p>
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
            <i class="ph ph-amazon-logo"></i>
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
              <p>Inicia sesión con tu cuenta corporativa para validar tus permisos y roles en Microsoft Entra ID.</p>
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
              <span>{{ isLoadingAzure ? 'Autenticando con Microsoft...' : 'Iniciar Sesión con Microsoft Entra ID' }}</span>
            </button>

            <div class="auth-error-msg" *ngIf="azureErrorMessage">
              <i class="ph ph-warning-circle"></i>
              <span>{{ azureErrorMessage }}</span>
            </div>

            <!-- Simulador Offline / Pruebas Rápidas (Solo en Desarrollo) -->
            <details class="dev-collapsible" *ngIf="!isProd">
              <summary><i class="ph ph-caret-right"></i> Simulador Local de Desarrollo (Sin Popup)</summary>
              <div class="dev-box-inner">
                <button type="button" class="btn-dev-role" (click)="loginAsMock('ADMIN')">
                  <i class="ph ph-crown"></i> Simular Rol: Administrador
                </button>
                <button type="button" class="btn-dev-role" (click)="loginAsMock('DESPACHADOR')">
                  <i class="ph ph-truck"></i> Simular Rol: Despachador
                </button>
                <button type="button" class="btn-dev-role" (click)="loginAsMock('USER')">
                  <i class="ph ph-user"></i> Simular Rol: Usuario Cliente
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
              <h3>
                {{ isConfirmCodeMode
                    ? 'Confirmar Correo en AWS Cognito'
                    : (isRegisterMode ? 'Crear Cuenta en AWS Cognito' : 'Acceso Clientes AWS Cognito') }}
              </h3>
              <p>
                {{ isConfirmCodeMode
                    ? 'Ingresa el código de verificación enviado por AWS Cognito a tu correo.'
                    : (isRegisterMode
                        ? 'Regístrate directamente en el User Pool de AWS Cognito.'
                        : 'Autentícate mediante OAuth2 Hosted UI (PKCE) o credenciales directas de Cognito.') }}
              </p>
            </div>

            <!-- Botón OAuth2 Hosted UI (Authorization Code + PKCE) -->
            <button
              *ngIf="!isConfirmCodeMode"
              type="button"
              class="btn-cognito-hosted"
              [disabled]="isLoadingCognito"
              (click)="loginWithCognitoHostedUi()">
              <i class="ph ph-amazon-logo"></i>
              <span>Continuar con AWS Cognito Hosted UI (OAuth2 / PKCE)</span>
            </button>

            <div class="divider-or" *ngIf="!isConfirmCodeMode">
              <span>o con credenciales directas del User Pool</span>
            </div>

            <!-- Formulario Confirmación de Código (ConfirmSignUp) -->
            <form class="cognito-form" *ngIf="isConfirmCodeMode" (ngSubmit)="handleCognitoConfirmCode()">
              <div class="form-group">
                <label>Correo Electrónico</label>
                <div class="input-with-icon">
                  <i class="ph ph-envelope-simple"></i>
                  <input
                    type="email"
                    [(ngModel)]="clientEmail"
                    name="confirmEmail"
                    placeholder="cliente@ejemplo.com"
                    required />
                </div>
              </div>

              <div class="form-group">
                <label>Código de Verificación (6 dígitos)</label>
                <div class="input-with-icon">
                  <i class="ph ph-key"></i>
                  <input
                    type="text"
                    [(ngModel)]="confirmationCode"
                    name="confirmationCode"
                    placeholder="123456"
                    required />
                </div>
              </div>

              <div class="auth-error-msg" *ngIf="cognitoErrorMessage">
                <i class="ph ph-warning-circle"></i>
                <span>{{ cognitoErrorMessage }}</span>
              </div>

              <div class="auth-success-msg" *ngIf="cognitoSuccessMessage">
                <i class="ph ph-check-circle"></i>
                <span>{{ cognitoSuccessMessage }}</span>
              </div>

              <button type="submit" class="btn-cognito-submit" [disabled]="isLoadingCognito">
                <i class="ph ph-spinner ph-spin" *ngIf="isLoadingCognito"></i>
                <i class="ph ph-check-circle" *ngIf="!isLoadingCognito"></i>
                <span>Confirmar Cuenta e Iniciar Sesión</span>
              </button>

              <div class="toggle-register-box">
                <button type="button" class="btn-text-toggle" (click)="isConfirmCodeMode = false">
                  Volver al inicio de sesión
                </button>
              </div>
            </form>

            <!-- Formulario Login / Registro directo contra Cognito IdP -->
            <form class="cognito-form" *ngIf="!isConfirmCodeMode" (ngSubmit)="handleCognitoSubmit()">
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

              <div class="form-group">
                <label>Contraseña</label>
                <div class="input-with-icon">
                  <i class="ph ph-lock-key"></i>
                  <input
                    type="password"
                    [(ngModel)]="clientPassword"
                    name="clientPassword"
                    placeholder="Mín. 8 caracteres, mayúscula, número y símbolo"
                    required />
                </div>
              </div>

              <div class="auth-error-msg" *ngIf="cognitoErrorMessage">
                <i class="ph ph-warning-circle"></i>
                <span>{{ cognitoErrorMessage }}</span>
              </div>

              <div class="auth-success-msg" *ngIf="cognitoSuccessMessage">
                <i class="ph ph-check-circle"></i>
                <span>{{ cognitoSuccessMessage }}</span>
              </div>

              <button
                type="submit"
                class="btn-cognito-submit"
                [disabled]="isLoadingCognito">
                <i class="ph ph-spinner ph-spin" *ngIf="isLoadingCognito"></i>
                <i class="ph ph-arrow-right" *ngIf="!isLoadingCognito"></i>
                <span>{{ isRegisterMode ? 'Registrarme en AWS Cognito' : 'Iniciar Sesión con AWS Cognito' }}</span>
              </button>

              <div class="toggle-register-box">
                <span *ngIf="!isRegisterMode">¿No tienes cuenta en el User Pool?</span>
                <span *ngIf="isRegisterMode">¿Ya tienes una cuenta registrada?</span>
                <button
                  type="button"
                  class="btn-text-toggle"
                  (click)="toggleCognitoMode()">
                  {{ isRegisterMode ? 'Inicia sesión aquí' : 'Regístrate aquí' }}
                </button>
              </div>
            </form>

            <!-- Configuración Runtime de AWS Cognito (Para Laboratorio AWS Academy) -->
            <details class="dev-collapsible" [open]="!authService.isCognitoConfigured()">
              <summary>
                <i class="ph ph-gear"></i>
                Parámetros del User Pool AWS Cognito {{ authService.isCognitoConfigured() ? '(Configurado)' : '(Requerido para conectar a AWS)' }}
              </summary>
              <div class="dev-box-inner">
                <div class="form-group">
                  <label>App Client ID (Cognito)</label>
                  <input
                    type="text"
                    class="cfg-input"
                    [(ngModel)]="cfgClientId"
                    name="cfgClientId"
                    placeholder="Ej. 5a1b2c3d4e5f6g7h8i9j0k" />
                </div>
                <div class="form-group">
                  <label>Dominio Hosted UI (Opcional si usas login directo)</label>
                  <input
                    type="text"
                    class="cfg-input"
                    [(ngModel)]="cfgDomain"
                    name="cfgDomain"
                    placeholder="Ej. https://pedidos360-auth.auth.us-east-1.amazoncognito.com" />
                </div>
                <div class="form-group">
                  <label>Región AWS / User Pool ID</label>
                  <div style="display: grid; grid-template-columns: 110px 1fr; gap: 8px;">
                    <input
                      type="text"
                      class="cfg-input"
                      [(ngModel)]="cfgRegion"
                      name="cfgRegion"
                      placeholder="us-east-1" />
                    <input
                      type="text"
                      class="cfg-input"
                      [(ngModel)]="cfgUserPoolId"
                      name="cfgUserPoolId"
                      placeholder="Ej. us-east-1_AbCdEf123" />
                  </div>
                </div>
                <button type="button" class="btn-dev-role" (click)="saveCognitoParameters()">
                  <i class="ph ph-floppy-disk"></i> Guardar Configuración Cognito
                </button>
              </div>
            </details>
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
            <span>IDaaS Clientes: <strong>AWS Cognito User Pool (OAuth2 + IDP API)</strong></span>
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
      gap: 14px;
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
    .btn-cognito-hosted {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: #0f172a;
      color: #ffffff;
      padding: 11px 16px;
      border-radius: 11px;
      font-weight: 700;
      font-size: 0.86rem;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-cognito-hosted:hover:not(:disabled) {
      background: #1e293b;
    }
    .divider-or {
      display: flex;
      align-items: center;
      text-align: center;
      color: #94a3b8;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .divider-or::before,
    .divider-or::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid #e2e8f0;
    }
    .divider-or span {
      padding: 0 10px;
    }
    .cognito-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .form-group label {
      font-size: 0.76rem;
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
    .input-with-icon input,
    .cfg-input {
      width: 100%;
      padding: 10px 14px 10px 38px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      font-size: 0.86rem;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }
    .cfg-input {
      padding: 8px 10px;
      font-size: 0.8rem;
    }
    .input-with-icon input:focus,
    .cfg-input:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    .btn-cognito-submit {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%);
      color: #ffffff;
      padding: 12px 18px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 0.9rem;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25);
      transition: all 0.2s ease;
      margin-top: 2px;
    }
    .btn-cognito-submit:hover:not(:disabled) {
      background: linear-gradient(135deg, #c2410c 0%, #9a3412 100%);
      transform: translateY(-1px);
    }
    .toggle-register-box {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 0.8rem;
      color: #64748b;
      margin-top: 2px;
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

    /* Error & Success Messages */
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
    .auth-success-msg {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 8px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #15803d;
      font-size: 0.8rem;
      font-weight: 600;
    }

    /* Dev & Runtime Collapsible */
    .dev-collapsible {
      margin-top: 4px;
      border: 1px dashed #cbd5e1;
      border-radius: 10px;
      padding: 10px 14px;
      background: #fafafa;
    }
    .dev-collapsible summary {
      font-size: 0.78rem;
      font-weight: 700;
      color: #475569;
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
      justify-content: center;
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
  readonly isProd = environment.production;

  // Azure State
  isLoadingAzure = false;
  azureErrorMessage = '';

  // Cognito State
  isRegisterMode = false;
  isConfirmCodeMode = false;
  isLoadingCognito = false;
  cognitoErrorMessage = '';
  cognitoSuccessMessage = '';
  clientName = '';
  clientEmail = '';
  clientPassword = '';
  confirmationCode = '';

  // Cognito Runtime Config Form
  cfgClientId = '';
  cfgDomain = '';
  cfgRegion = 'us-east-1';
  cfgUserPoolId = '';

  private returnUrl: string | null = null;

  constructor(
    public authService: AuthService,
    private cartService: CartService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async ngOnInit(): Promise<void> {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || null;
    const cfg = this.authService.cognitoConfig();
    this.cfgClientId = cfg.clientId;
    this.cfgDomain = cfg.domain;
    this.cfgRegion = cfg.region || 'us-east-1';
    this.cfgUserPoolId = cfg.userPoolId;

    // Handle OAuth2 Authorization Code callback from AWS Cognito Hosted UI
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
        this.cognitoErrorMessage = err?.message || 'Error al procesar respuesta OAuth2 de AWS Cognito.';
      } finally {
        this.isLoadingCognito = false;
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
      this.azureErrorMessage = err?.message || 'Error al autenticar con Microsoft Entra ID';
    } finally {
      this.isLoadingAzure = false;
    }
  }

  async loginWithCognitoHostedUi(): Promise<void> {
    try {
      this.isLoadingCognito = true;
      this.cognitoErrorMessage = '';
      await this.authService.loginWithCognitoHostedUi();
    } catch (err: any) {
      this.cognitoErrorMessage = err?.message || 'No se pudo iniciar el flujo Hosted UI de AWS Cognito.';
      this.isLoadingCognito = false;
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
          this.cognitoSuccessMessage = 'Cuenta creada en AWS Cognito. Ingresa el código enviado a tu correo.';
        }
      } else {
        await this.authService.loginWithCognitoCredentials(this.clientEmail, this.clientPassword);
        this.redirectByRole();
      }
    } catch (err: any) {
      this.cognitoErrorMessage = err?.message || 'Error al autenticar con AWS Cognito User Pool.';
    } finally {
      this.isLoadingCognito = false;
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
        this.cognitoSuccessMessage = 'Correo verificado en AWS Cognito. Ahora puedes iniciar sesión.';
      }
    } catch (err: any) {
      this.cognitoErrorMessage = err?.message || 'Error al verificar código en AWS Cognito.';
    } finally {
      this.isLoadingCognito = false;
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
    this.cognitoSuccessMessage = 'Parámetros de AWS Cognito guardados correctamente en el navegador.';
  }

  loginAsMock(role: 'ADMIN' | 'DESPACHADOR' | 'USER'): void {
    this.authService.loginAsDevUser(role);
    this.redirectByRole();
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
