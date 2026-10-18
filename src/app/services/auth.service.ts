import { Injectable, signal, computed } from '@angular/core';
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
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSignal = signal<UserProfile | null>(this.getStoredUser());
  private tokenSignal = signal<string | null>(localStorage.getItem('p360_token'));
  private pca: PublicClientApplication | null = null;
  private pcaInitPromise: Promise<PublicClientApplication | null> | null = null;

  readonly currentUser = computed(() => this.userSignal());
  readonly isAuthenticated = computed(() => !!this.userSignal());
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
    if (this.isMsalConfigured) {
      // Limpiar usuarios mock previos para no bloquear el login real de Azure
      const stored = this.getStoredUser();
      if (stored && stored.username.includes('.local')) {
        this.clearSession();
      }
      this.initMsal();
    } else if (!this.userSignal()) {
      this.loginAsDevUser('ADMIN');
    }
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

        const accounts = instance.getAllAccounts();
        if (accounts.length > 0) {
          instance.setActiveAccount(accounts[0]);
          if (!this.userSignal()) {
            this.setUserFromAccount(accounts[0]);
          }
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
      this.loginAsDevUser('ADMIN');
      return;
    }

    const pca = await this.initMsal();
    if (!pca) {
      throw new Error('No se pudo inicializar el cliente MSAL de Microsoft');
    }

    const requestScopes = ['openid', 'profile', 'email'];
    if (environment.msal.apiScope) {
      requestScopes.push(environment.msal.apiScope);
    }

    try {
      const response: AuthenticationResult = await pca.loginPopup({
        scopes: requestScopes,
        prompt: 'select_account'
      });
      pca.setActiveAccount(response.account);
      this.handleAuthResponse(response);
    } catch (error: any) {
      console.error('Error durante loginPopup con Microsoft Entra ID:', error);
      throw error;
    }
  }

  private extractRolesFromTokenAndClaims(claims: Record<string, any>, rawToken?: string): string[] {
    const extracted = new Set<string>();

    const addFromList = (list: unknown) => {
      if (Array.isArray(list)) {
        for (const item of list) {
          if (typeof item === 'string' && item.trim()) {
            extracted.add(item.trim());
          }
        }
      }
    };

    addFromList(claims['roles']);
    addFromList(claims['cognito:groups']);

    if (rawToken && rawToken.split('.').length === 3) {
      try {
        const base64Url = rawToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        addFromList(payload['roles']);
        addFromList(payload['cognito:groups']);
      } catch {
        // Ignore malformed token payload
      }
    }

    return extracted.size > 0 ? Array.from(extracted) : ['Usuario'];
  }

  private handleAuthResponse(response: AuthenticationResult): void {
    const account: AccountInfo = response.account;
    const claims = (account.idTokenClaims || {}) as Record<string, any>;
    const token = response.accessToken || response.idToken;
    const roles = this.extractRolesFromTokenAndClaims(claims, token);

    const user: UserProfile = {
      name: account.name || account.username,
      username: account.username,
      roles: roles,
      scopes: response.scopes || []
    };

    this.userSignal.set(user);
    this.tokenSignal.set(token);
    localStorage.setItem('p360_user', JSON.stringify(user));
    localStorage.setItem('p360_token', token);
  }

  private setUserFromAccount(account: AccountInfo): void {
    const claims = (account.idTokenClaims || {}) as Record<string, any>;
    const storedToken = localStorage.getItem('p360_token') || undefined;
    const roles = this.extractRolesFromTokenAndClaims(claims, storedToken);

    const user: UserProfile = {
      name: account.name || account.username,
      username: account.username,
      roles: roles,
      scopes: []
    };

    this.userSignal.set(user);
    localStorage.setItem('p360_user', JSON.stringify(user));
  }

  clearSession(): void {
    this.userSignal.set(null);
    this.tokenSignal.set(null);
    localStorage.removeItem('p360_user');
    localStorage.removeItem('p360_token');
  }

  async logout(): Promise<void> {
    if (this.isMsalConfigured && this.pca) {
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
  }

  loginAsDevUser(role: 'USER' | 'ADMIN'): void {
    const devUser: UserProfile = {
      name: role === 'ADMIN' ? 'Administrador Cloud' : 'Usuario Operador',
      username: role === 'ADMIN' ? 'admin@pedidos360.local' : 'operador@pedidos360.local',
      roles: role === 'ADMIN' ? ['ADMIN', 'Administrador'] : ['USER', 'Usuario'],
      scopes: ['pedidos.read', 'pedidos.write', 'productos.read']
    };
    const mockToken = `mock-dev-jwt-${role.toLowerCase()}-${Date.now()}`;

    this.userSignal.set(devUser);
    this.tokenSignal.set(mockToken);
    localStorage.setItem('p360_user', JSON.stringify(devUser));
    localStorage.setItem('p360_token', mockToken);
  }

  getAccessToken(): string | null {
    return this.tokenSignal();
  }

  private getStoredUser(): UserProfile | null {
    try {
      const stored = localStorage.getItem('p360_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
}
