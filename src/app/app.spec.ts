import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { App } from './app';
import { CartService } from './services/cart.service';
import { AuthService } from './services/auth.service';

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
  };
}

describe('Pedidos360 Frontend Suite', () => {
  beforeEach(async () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createMemoryStorage(),
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: createMemoryStorage(),
      configurable: true,
      writable: true,
    });

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
  });

  it('should create the App shell and render Pedidos360 navigation', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Pedidos360');
    expect(compiled.textContent).toContain('Catálogo');
    expect(compiled.textContent).toContain('Rastreo Despachos');
  });

  it('should track cart items, compute totals, and clear local state upon sincronizarPostOrden', () => {
    const cartService = TestBed.inject(CartService);
    cartService.cart.set({
      items: [
        {
          id: 1,
          productCode: 'PROD-001',
          productName: 'Laptop Pro 16',
          unitPrice: 1500,
          quantity: 1,
          subtotal: 1500,
        },
        {
          id: 2,
          productCode: 'PROD-003',
          productName: 'Teclado Mecánico',
          unitPrice: 100,
          quantity: 1,
          subtotal: 100,
        },
      ],
      totalItems: 2,
      totalAmount: 1600,
    });

    expect(cartService.totalItems()).toBe(2);
    expect(cartService.totalAmount()).toBe(1600);

    cartService.sincronizarPostOrden();
    expect(cartService.totalItems()).toBe(0);
    expect(cartService.items().length).toBe(0);
  });

  it('should extract roles exclusively from JWT claims and never from email address substrings', () => {
    const authService = TestBed.inject(AuthService);
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payloadNoRoles = btoa(
      JSON.stringify({
        sub: 'user-123',
        email: 'admin-fake@duocuc.cl',
        name: 'Fake Admin',
        iss: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_TestPool',
      })
    );
    const tokenNoRoles = `${header}.${payloadNoRoles}.sig`;

    const rolesNoClaims: string[] = (authService as any).extractRolesFromTokenAndClaims(
      { email: 'admin-fake@duocuc.cl' },
      tokenNoRoles
    );
    expect(rolesNoClaims).toEqual(['Usuario']);

    const payloadDispatcher = btoa(
      JSON.stringify({
        sub: 'disp-456',
        email: 'operador@pedidos360.cl',
        'cognito:groups': ['Despachador'],
        iss: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_TestPool',
      })
    );
    const tokenDispatcher = `${header}.${payloadDispatcher}.sig`;
    const rolesDispatcher: string[] = (authService as any).extractRolesFromTokenAndClaims(
      {},
      tokenDispatcher
    );
    expect(rolesDispatcher).toContain('Despachador');

    authService.loginAsDevUser('DESPACHADOR');
    expect(authService.isDespachador()).toBe(true);
    expect(authService.isAdmin()).toBe(false);
    expect(authService.primaryRole()).toBe('Despachador');
  });
});
