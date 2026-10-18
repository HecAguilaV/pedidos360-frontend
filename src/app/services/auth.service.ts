import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  PublicClientApplication,
  Configuration,
  AccountInfo,
  AuthenticationResult
} from '@azure/msal-browser';
import { environment } from '../../environments/environment';

export interface UserProfile {
  name: string;
  username: string;
  roles: string[];
  scopes: string[];
  provider?: 'AZURE_ENTRA' | 'AWS_COGNITO';
}

export interface CognitoRuntimeConfig {
  domain: string;
  clientId: string;
  userPoolId: string;
  region: string;
  redirectUri: string;
  scopes: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSignal = signal<UserProfile | null>(this.getStoredUser());
  private tokenSignal = signal<string | null>(localStorage.getItem('p360_token'));
  private cognitoConfigSignal = signal<CognitoRuntimeConfig>(this.loadInitialCognitoConfig());
  private pca: PublicClientApplication | null = null;
  private pcaInitPromise: Promise<PublicClientApplication | null> | null = null;
  private router = inject(Router);

  readonly currentUser = computed(() => this.userSignal());
  readonly isAuthenticated = computed(() => !!this.userSignal());
  readonly cognitoConfig = computed(() => this.cognitoConfigSignal());
  readonly isCognitoConfigured = computed(() => {
    const cfg = this.cognitoConfigSignal();
    return !!cfg.clientId && cfg.clientId.trim() !== '';
  });
  readonly isCognitoHostedUiConfigured = computed(() => {
    const cfg = this.cognitoConfigSignal();
    return !!cfg.clientId && cfg.clientId.trim() !== '' && !!cfg.domain && cfg.domain.trim() !== '';
  });
  readonly isAdmin = computed(() => {
    const roles = this.userSignal()?.roles || [];
    return roles.includes('ADMIN') || roles.includes('Administrador');
  });
  readonly isDespachador = computed(() => {
    const roles = this.userSignal()?.roles || [];
    return roles.includes('Despachador');
  });
  readonly primaryRole = computed(() => {
    if (this.isAdmin()) return 'Administrador';
    if (this.isDespachador()) return 'Despachador';
    return 'Usuario';
  });

  get isMsalConfigured(): boolean {
    return !!environment.msal.clientId && environment.msal.clientId.trim() !== '';
  }

  constructor() {
    this.fetchRuntimeConfigJson();

    const stored = this.getStoredUser();
    const storedToken = localStorage.getItem('p360_token') || '';
    if (
      (stored && (stored.username.includes('.local') || (stored as any).provider === 'DEV_SIMULATOR')) ||
      storedToken.startsWith('mock-dev-jwt-')
    ) {
      this.clearSession();
    }

    if (this.isMsalConfigured) {
      this.initMsal();
    }
  }

  private loadInitialCognitoConfig(): CognitoRuntimeConfig {
    const base: CognitoRuntimeConfig = {
      domain: environment.cognito?.domain || '',
      clientId: environment.cognito?.clientId || '',
      userPoolId: environment.cognito?.userPoolId || '',
      region: environment.cognito?.region || 'us-east-1',
      redirectUri: environment.cognito?.redirectUri || (typeof window !== 'undefined' ? `${window.location.origin}/login` : 'http://localhost:4200/login'),
      scopes: environment.cognito?.scopes || 'openid profile email'
    };

    try {
      const saved = localStorage.getItem('p360_cognito_config');
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<CognitoRuntimeConfig>;
        return {
          domain: parsed.domain ?? base.domain,
          clientId: parsed.clientId ?? base.clientId,
          userPoolId: parsed.userPoolId ?? base.userPoolId,
          region: parsed.region || base.region,
          redirectUri: parsed.redirectUri || base.redirectUri,
          scopes: parsed.scopes || base.scopes
        };
      }
    } catch {
      // Ignore invalid localStorage config
    }
    return base;
  }

  private async fetchRuntimeConfigJson(): Promise<void> {
    if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
    try {
      const res = await fetch('/assets/runtime-config.json', { cache: 'no-store' });
      if (!res.ok) return;
      const runtime = await res.json();
      if (runtime?.cognito) {
        const current = this.cognitoConfigSignal();
        const merged: CognitoRuntimeConfig = {
          domain: runtime.cognito.domain || current.domain,
          clientId: runtime.cognito.clientId || current.clientId,
          userPoolId: runtime.cognito.userPoolId || current.userPoolId,
          region: runtime.cognito.region || current.region || 'us-east-1',
          redirectUri: runtime.cognito.redirectUri || current.redirectUri || `${window.location.origin}/login`,
          scopes: runtime.cognito.scopes || current.scopes || 'openid profile email'
        };
        this.cognitoConfigSignal.set(merged);
      }
    } catch {
      // Optional runtime-config.json not present in local dev
    }
  }

  saveCognitoRuntimeConfig(config: Partial<CognitoRuntimeConfig>): void {
    const current = this.cognitoConfigSignal();
    const updated: CognitoRuntimeConfig = {
      domain: (config.domain ?? current.domain).trim().replace(/\/+$/, ''),
      clientId: (config.clientId ?? current.clientId).trim(),
      userPoolId: (config.userPoolId ?? current.userPoolId).trim(),
      region: (config.region ?? current.region).trim() || 'us-east-1',
      redirectUri: (config.redirectUri ?? current.redirectUri).trim() || (typeof window !== 'undefined' ? `${window.location.origin}/login` : 'http://localhost:4200/login'),
      scopes: (config.scopes ?? current.scopes).trim() || 'openid profile email'
    };
    this.cognitoConfigSignal.set(updated);
    localStorage.setItem('p360_cognito_config', JSON.stringify(updated));
  }

  private async initMsal(): Promise<PublicClientApplication | null> {
    if (!this.isMsalConfigured) return null;
    if (this.pcaInitPromise) return this.pcaInitPromise;

    this.pcaInitPromise = (async () => {
      try {
        const config: Configuration = {
          auth: {
            clientId: environment.msal.clientId,
            authority: `https://login.microsoftonline.com/${environment.msal.tenantId}`,
            redirectUri: environment.msal.redirectUri || window.location.origin
          },
          cache: {
            cacheLocation: 'localStorage'
          }
        };

        const instance = new PublicClientApplication(config);
        await instance.initialize();
        this.pca = instance;

        // Only handle redirect if URL actually contains auth response parameters (avoids no_token_request_cache_error)
        const hasRedirectHash =
          typeof window !== 'undefined' &&
          (window.location.hash.includes('code=') ||
            window.location.hash.includes('error=') ||
            window.location.search.includes('code='));

        if (hasRedirectHash) {
          try {
            const redirectResponse = await instance.handleRedirectPromise();
            if (redirectResponse && redirectResponse.account) {
              instance.setActiveAccount(redirectResponse.account);
              this.handleAuthResponse(redirectResponse);
            }
          } catch (redirectErr) {
            console.warn('Advertencia en handleRedirectPromise de MSAL:', redirectErr);
          }
        }

        const accounts = instance.getAllAccounts();
        if (accounts.length > 0) {
          instance.setActiveAccount(accounts[0]);
          // Note: Do NOT auto-login here. Explicit user login via prompt: 'login' is required.
        }
        return instance;
      } catch (err) {
        console.error('Error inicializando MSAL:', err);
        return null;
      }
    })();

    return this.pcaInitPromise;
  }

  async login(): Promise<void> {
    if (!this.isMsalConfigured) {
      throw new Error('Microsoft Entra ID no está configurado en este entorno.');
    }

    const pca = await this.initMsal();
    if (!pca) {
      throw new Error('No se pudo inicializar el cliente MSAL de Microsoft');
    }

    // Clear any orphaned interaction locks left by closed/crashed popups
    this.clearMsalInteractionLocks();

    const requestScopes = ['openid', 'profile', 'email'];
    if (environment.msal.apiScope) {
      requestScopes.push(environment.msal.apiScope);
    }

    try {
      // Force interactive authentication: prompt: 'login' demands password + 2FA
      const response: AuthenticationResult = await pca.loginPopup({
        scopes: requestScopes,
        prompt: 'login'
      });
      pca.setActiveAccount(response.account);
      this.handleAuthResponse(response);
    } catch (error: any) {
      const errorStr = (error?.errorCode || error?.message || '').toLowerCase();
      if (errorStr.includes('interaction_in_progress')) {
        this.clearMsalInteractionLocks();
        console.warn('Bloqueo interaction_in_progress detectado. Reintentando loginPopup tras limpiar locks...');
        try {
          const retryResponse: AuthenticationResult = await pca.loginPopup({
            scopes: requestScopes,
            prompt: 'login'
          });
          pca.setActiveAccount(retryResponse.account);
          this.handleAuthResponse(retryResponse);
          return;
        } catch (retryErr: any) {
          console.error('Error en reintento de loginPopup con Microsoft Entra ID:', retryErr);
          throw this.sanitizeMsalErrorMessage(retryErr);
        }
      }
      console.error('Error durante loginPopup con Microsoft Entra ID:', error);
      throw this.sanitizeMsalErrorMessage(error);
    }
  }

  /**
   * AWS Cognito Hosted UI OAuth2 Authorization Code + PKCE Redirect
   */
  async loginWithCognitoHostedUi(): Promise<void> {
    const cfg = this.cognitoConfigSignal();
    if (!cfg.domain || !cfg.clientId) {
      throw new Error('Configura el Dominio Hosted UI y el Client ID de tu User Pool de AWS Cognito.');
    }

    const normalizedDomain = cfg.domain.startsWith('http') ? cfg.domain : `https://${cfg.domain}`;
    const verifier = this.generateRandomString(64);
    const challenge = await this.computePkceChallenge(verifier);
    sessionStorage.setItem('p360_cognito_pkce_verifier', verifier);

    const redirectUri = cfg.redirectUri || `${window.location.origin}/login`;
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: cfg.clientId,
      redirect_uri: redirectUri,
      scope: cfg.scopes || 'openid profile email',
      code_challenge_method: 'S256',
      code_challenge: challenge
    });

    window.location.href = `${normalizedDomain}/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Exchanges OAuth2 authorization code from AWS Cognito Hosted UI for JWT tokens
   */
  async exchangeCognitoCode(code: string): Promise<UserProfile> {
    const cfg = this.cognitoConfigSignal();
    if (!cfg.domain || !cfg.clientId) {
      throw new Error('Falta configuración de dominio o Client ID de AWS Cognito para canjear el código OAuth2.');
    }

    const normalizedDomain = cfg.domain.startsWith('http') ? cfg.domain : `https://${cfg.domain}`;
    const redirectUri = cfg.redirectUri || `${window.location.origin}/login`;
    const verifier = sessionStorage.getItem('p360_cognito_pkce_verifier') || '';

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: cfg.clientId,
      code: code,
      redirect_uri: redirectUri
    });
    if (verifier) {
      body.set('code_verifier', verifier);
    }

    const response = await fetch(`${normalizedDomain}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error_description || data.error || 'Error al canjear código OAuth2 en AWS Cognito.');
    }

    sessionStorage.removeItem('p360_cognito_pkce_verifier');
    const idToken = data.id_token as string;
    const accessToken = (data.access_token as string) || idToken;
    return this.establishCognitoSessionFromTokens(idToken || accessToken, accessToken);
  }

  /**
   * Direct AWS Cognito User Pool Authentication (InitiateAuth USER_PASSWORD_AUTH)
   */
  async loginWithCognitoCredentials(email: string, password: string): Promise<UserProfile> {
    const cfg = this.cognitoConfigSignal();
    if (!cfg.clientId) {
      throw new Error('Configura primero el App Client ID de tu AWS Cognito User Pool en la sección de configuración.');
    }

    const endpoint = `https://cognito-idp.${cfg.region || 'us-east-1'}.amazonaws.com/`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth'
      },
      body: JSON.stringify({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: cfg.clientId,
        AuthParameters: {
          USERNAME: email.trim(),
          PASSWORD: password
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      const msg = data.message || data.__type || 'Error al autenticar contra AWS Cognito User Pool.';
      throw new Error(msg);
    }

    const authResult = data.AuthenticationResult;
    if (!authResult) {
      throw new Error(`Se requiere desafío adicional en Cognito (${data.ChallengeName || 'Challenge'}). Usa Hosted UI o confirma la cuenta.`);
    }

    const idToken = authResult.IdToken as string;
    const accessToken = (authResult.AccessToken as string) || idToken;
    return this.establishCognitoSessionFromTokens(idToken || accessToken, accessToken, email.trim());
  }

  /**
   * Direct AWS Cognito User Pool Self-Registration (SignUp)
   */
  async registerWithCognito(name: string, email: string, password: string): Promise<{ userConfirmed: boolean }> {
    const cfg = this.cognitoConfigSignal();
    if (!cfg.clientId) {
      throw new Error('Configura primero el App Client ID de tu AWS Cognito User Pool.');
    }

    const endpoint = `https://cognito-idp.${cfg.region || 'us-east-1'}.amazonaws.com/`;
    const attributes = [
      { Name: 'email', Value: email.trim() }
    ];
    if (name && name.trim()) {
      attributes.push({ Name: 'name', Value: name.trim() });
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.SignUp'
      },
      body: JSON.stringify({
        ClientId: cfg.clientId,
        Username: email.trim(),
        Password: password,
        UserAttributes: attributes
      })
    });

    const data = await response.json();
    if (!response.ok) {
      const msg = data.message || data.__type || 'Error al registrar usuario en AWS Cognito.';
      throw new Error(msg);
    }

    return { userConfirmed: !!data.UserConfirmed };
  }

  /**
   * Confirm AWS Cognito Self-Registration with verification code sent by email (ConfirmSignUp)
   */
  async confirmCognitoRegistration(email: string, confirmationCode: string): Promise<void> {
    const cfg = this.cognitoConfigSignal();
    if (!cfg.clientId) {
      throw new Error('Configura primero el App Client ID de tu AWS Cognito User Pool.');
    }

    const endpoint = `https://cognito-idp.${cfg.region || 'us-east-1'}.amazonaws.com/`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.ConfirmSignUp'
      },
      body: JSON.stringify({
        ClientId: cfg.clientId,
        Username: email.trim(),
        ConfirmationCode: confirmationCode.trim()
      })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || data.__type || 'Código de verificación inválido en AWS Cognito.');
    }
  }

  private establishCognitoSessionFromTokens(idToken: string, accessToken: string, fallbackEmail?: string): UserProfile {
    const idClaims = this.decodeJwtPayload(idToken);
    const accessClaims = this.decodeJwtPayload(accessToken);
    const mergedClaims = { ...accessClaims, ...idClaims };

    const email = mergedClaims['email'] || mergedClaims['cognito:username'] || fallbackEmail || 'cliente@cognito.aws';
    const roles = this.extractRolesFromTokenAndClaims(mergedClaims, idToken, email);
    const name = mergedClaims['name'] || mergedClaims['nickname'] || email.split('@')[0];
    const scopeStr = (mergedClaims['scope'] as string) || 'openid profile email';

    const user: UserProfile = {
      name,
      username: email,
      roles,
      scopes: scopeStr.split(' ').filter(Boolean),
      provider: 'AWS_COGNITO'
    };

    // Prefer idToken when communicating with API Gateway / Spring Resource Server so email & cognito:groups claims are present
    const tokenToStore = idToken || accessToken;
    this.setSession(user, tokenToStore);
    return user;
  }

  setSession(user: UserProfile, token: string): void {
    this.userSignal.set(user);
    this.tokenSignal.set(token);
    localStorage.setItem('p360_user', JSON.stringify(user));
    localStorage.setItem('p360_token', token);
  }

  private decodeJwtPayload(token?: string): Record<string, any> {
    if (!token || token.split('.').length !== 3) return {};
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return {};
    }
  }

  private extractRolesFromTokenAndClaims(
    claims: Record<string, any>,
    rawToken?: string,
    accountUsername?: string,
    rawIdToken?: string
  ): string[] {
    const extracted = new Set<string>();

    const addFromList = (list: unknown) => {
      if (Array.isArray(list)) {
        for (const item of list) {
          if (typeof item === 'string' && item.trim()) {
            extracted.add(item.trim());
          }
        }
      } else if (typeof list === 'string' && list.trim()) {
        extracted.add(list.trim());
      }
    };

    if (claims) {
      addFromList(claims['roles']);
      addFromList(claims['cognito:groups']);
      addFromList(claims['groups']);
      addFromList(claims['wids']);
    }

    if (rawToken) {
      const payload = this.decodeJwtPayload(rawToken);
      addFromList(payload['roles']);
      addFromList(payload['cognito:groups']);
      addFromList(payload['groups']);
      addFromList(payload['wids']);
    }

    if (rawIdToken && rawIdToken !== rawToken) {
      const payloadId = this.decodeJwtPayload(rawIdToken);
      addFromList(payloadId['roles']);
      addFromList(payloadId['cognito:groups']);
      addFromList(payloadId['groups']);
      addFromList(payloadId['wids']);
    }

    // Role alias and directory role normalization
    for (const r of Array.from(extracted)) {
      const lower = r.toLowerCase();
      if (lower === 'admin' || lower === 'administrator' || lower === 'administrador') {
        extracted.add('Administrador');
        extracted.add('ADMIN');
      }
      if (lower === 'despachador' || lower === 'dispatcher' || lower.includes('despach')) {
        extracted.add('Despachador');
      }
      // Azure AD Global Administrator Directory Role WID GUID
      if (r === '62e90394-69f5-4237-9190-012177145e10') {
        extracted.add('Administrador');
        extracted.add('ADMIN');
      }
    }

    // Canonical lab tenant identities from documentation (BlockNotas.md)
    const normalizedUsername = (
      accountUsername ||
      (claims && (claims['preferred_username'] || claims['upn'] || claims['unique_name'] || claims['email'])) ||
      ''
    ).trim().toLowerCase();

    if (normalizedUsername === 'hector.aguila@josecamposar.onmicrosoft.com') {
      extracted.add('Administrador');
      extracted.add('ADMIN');
    } else if (normalizedUsername === 'despacho_aguila@josecamposar.onmicrosoft.com') {
      extracted.add('Despachador');
    }

    return extracted.size > 0 ? Array.from(extracted) : ['Usuario'];
  }

  private handleAuthResponse(response: AuthenticationResult): void {
    const account: AccountInfo = response.account;
    const claims = (account.idTokenClaims || {}) as Record<string, any>;
    const token = response.accessToken || response.idToken;
    const username = (
      account.username ||
      (claims['preferred_username'] as string) ||
      (claims['upn'] as string) ||
      (claims['email'] as string) ||
      ''
    ).trim();
    const roles = this.extractRolesFromTokenAndClaims(claims, token, username, response.idToken);

    const user: UserProfile = {
      name: account.name || username || 'Colaborador',
      username: username || account.username,
      roles: roles,
      scopes: response.scopes || [],
      provider: 'AZURE_ENTRA'
    };

    this.setSession(user, token);
  }

  private setUserFromAccount(account: AccountInfo): void {
    const claims = (account.idTokenClaims || {}) as Record<string, any>;
    const storedToken = localStorage.getItem('p360_token') || undefined;
    const username = (
      account.username ||
      (claims['preferred_username'] as string) ||
      (claims['upn'] as string) ||
      (claims['email'] as string) ||
      ''
    ).trim();
    const roles = this.extractRolesFromTokenAndClaims(claims, storedToken, username);

    const user: UserProfile = {
      name: account.name || username || 'Colaborador',
      username: username || account.username,
      roles: roles,
      scopes: [],
      provider: 'AZURE_ENTRA'
    };

    this.userSignal.set(user);
    localStorage.setItem('p360_user', JSON.stringify(user));
  }

  clearSession(): void {
    this.userSignal.set(null);
    this.tokenSignal.set(null);
    localStorage.removeItem('p360_user');
    localStorage.removeItem('p360_token');
    this.clearMsalInteractionLocks();
    if (this.pca) {
      try {
        const accounts = this.pca.getAllAccounts();
        for (const acc of accounts) {
          this.pca.setActiveAccount(null);
        }
      } catch {
        // ignore
      }
    }
  }

  async logout(): Promise<void> {
    this.clearMsalInteractionLocks();
    const current = this.userSignal();
    if (current?.provider === 'AZURE_ENTRA' && this.isMsalConfigured && this.pca) {
      try {
        const account = this.pca.getActiveAccount() || this.pca.getAllAccounts()[0];
        if (account) {
          await this.pca.logoutPopup({ account });
        }
      } catch (err) {
        console.warn('Error en logoutPopup de MSAL:', err);
      }
    }

    this.clearSession();
    this.router.navigate(['/login']);
  }

  clearMsalInteractionLocks(): void {
    if (typeof window === 'undefined') return;
    const storages = [sessionStorage, localStorage];
    for (const storage of storages) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (
            key &&
            (key.includes('interaction.status') ||
              key.includes('interaction_status') ||
              key.includes('temporary.cache') ||
              key.includes('acquireToken.request'))
          ) {
            keysToRemove.push(key);
          }
        }
        for (const key of keysToRemove) {
          storage.removeItem(key);
        }
      } catch {
        // Storage access may fail in restricted sandboxes
      }
    }
  }

  private sanitizeMsalErrorMessage(error: any): Error {
    const rawMsg = (error?.message || error?.errorMessage || error?.errorCode || String(error)).toLowerCase();
    if (rawMsg.includes('popup_window_error') || rawMsg.includes('failed to open popup window') || rawMsg.includes('popup')) {
      return new Error('El navegador bloqueó la ventana emergente de inicio de sesión de Microsoft. Por favor permite las ventanas emergentes (popups) en la barra de direcciones de tu navegador.');
    }
    if (rawMsg.includes('user_cancelled') || rawMsg.includes('user cancelled')) {
      return new Error('Inicio de sesión cancelado por el usuario.');
    }
    if (rawMsg.includes('interaction_in_progress')) {
      return new Error('Había una interacción de autenticación previa en progreso. Hemos restablecido la conexión; por favor haz clic nuevamente para ingresar.');
    }
    return new Error(error?.message || 'No se pudo completar el inicio de sesión con Microsoft Entra ID.');
  }

  getAccessToken(): string | null {
    return this.tokenSignal();
  }

  private getStoredUser(): UserProfile | null {
    try {
      const stored = localStorage.getItem('p360_user');
      if (!stored) return null;
      const user = JSON.parse(stored) as UserProfile;
      if (user && user.username) {
        const u = user.username.trim().toLowerCase();
        if (u === 'hector.aguila@josecamposar.onmicrosoft.com') {
          if (!user.roles || !user.roles.includes('Administrador')) {
            user.roles = ['Administrador', 'ADMIN'];
            localStorage.setItem('p360_user', JSON.stringify(user));
          }
        } else if (u === 'despacho_aguila@josecamposar.onmicrosoft.com') {
          if (!user.roles || !user.roles.includes('Despachador')) {
            user.roles = ['Despachador'];
            localStorage.setItem('p360_user', JSON.stringify(user));
          }
        }
      }
      return user;
    } catch {
      return null;
    }
  }

  private generateRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const values = new Uint8Array(length);
    crypto.getRandomValues(values);
    return Array.from(values, b => charset[b % charset.length]).join('');
  }

  private async computePkceChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const bytes = new Uint8Array(digest);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}
