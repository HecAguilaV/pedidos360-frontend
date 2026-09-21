import { Injectable, signal, computed } from '@angular/core';
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

  readonly currentUser = computed(() => this.userSignal());
  readonly isAuthenticated = computed(() => !!this.userSignal());
  readonly isAdmin = computed(() => this.userSignal()?.roles.includes('ADMIN') ?? false);

  get isMsalConfigured(): boolean {
    return !!environment.msal.clientId && environment.msal.clientId.trim() !== '';
  }

  constructor() {
    // If no user is logged in and not configured for Azure, provide default dev user
    if (!this.userSignal() && !this.isMsalConfigured) {
      this.loginAsDevUser('ADMIN');
    }
  }

  loginAsDevUser(role: 'USER' | 'ADMIN'): void {
    const devUser: UserProfile = {
      name: role === 'ADMIN' ? 'Administrador Cloud' : 'Usuario Operador',
      username: role === 'ADMIN' ? 'admin@pedidos360.local' : 'operador@pedidos360.local',
      roles: role === 'ADMIN' ? ['ADMIN', 'USER'] : ['USER'],
      scopes: role === 'ADMIN'
        ? ['pedidos.read', 'pedidos.write', 'productos.read', 'productos.write']
        : ['pedidos.read', 'pedidos.write', 'productos.read']
    };
    const mockToken = `mock-dev-jwt-${role.toLowerCase()}-${Date.now()}`;
    
    this.userSignal.set(devUser);
    this.tokenSignal.set(mockToken);
    localStorage.setItem('p360_user', JSON.stringify(devUser));
    localStorage.setItem('p360_token', mockToken);
  }

  login(): void {
    if (this.isMsalConfigured) {
      // In MSAL mode, redirect flow will be handled by MsalService
      console.log('Iniciando flujo OAuth 2.0 / OIDC con Microsoft Entra ID...');
    } else {
      this.loginAsDevUser('ADMIN');
    }
  }

  logout(): void {
    this.userSignal.set(null);
    this.tokenSignal.set(null);
    localStorage.removeItem('p360_user');
    localStorage.removeItem('p360_token');
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
