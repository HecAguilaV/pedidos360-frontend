import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { App } from './app';
import { CartService } from './services/cart.service';
import { AuthService, UserProfile } from './services/auth.service';
import { PedidosService } from './services/pedidos.service';
import { EnviosService } from './services/envios.service';
import { Pedido } from './models/pedido.model';
import { adminGuard, authGuard, staffGuard } from './guards/auth.guard';

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

/** Test-only: simulates an authenticated session without any production backdoor. */
function setSession(roles: string[] | null): void {
  const auth = TestBed.inject(AuthService) as any;
  const profile: UserProfile | null = roles
    ? { name: 'Test User', username: 'test@ejemplo.cl', roles, scopes: [] }
    : null;
  auth.userSignal.set(profile);
}

function runGuard(guard: typeof authGuard): boolean | UrlTree {
  return TestBed.runInInjectionContext(() => guard({} as any, {} as any)) as boolean | UrlTree;
}

function seedCart(cart: CartService, amounts: number[]): void {
  const items = amounts.map((amount, i) => ({
    id: i + 1,
    productCode: `PROD-00${i + 1}`,
    productName: `Producto ${i + 1}`,
    unitPrice: amount,
    quantity: 1,
    subtotal: amount,
  }));
  cart.cart.set({
    items,
    totalItems: items.length,
    totalAmount: amounts.reduce((a, b) => a + b, 0),
  });
}

describe('Pedidos360 Frontend Suite', () => {
  let createdOrders: Pedido[];
  let shipmentForOrder: { numeroGuia: string } | null;

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

    createdOrders = [];
    shipmentForOrder = null;

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        {
          provide: PedidosService,
          useValue: {
            createPedido: (p: Pedido) => {
              createdOrders.push(p);
              return of({ ...p, id: 501 });
            },
            getPedidos: () => of([]),
          },
        },
        {
          provide: EnviosService,
          useValue: {
            obtenerPorOrden: () => of(shipmentForOrder),
            listarEnvios: () => of([]),
          },
        },
      ],
    }).compileComponents();
  });

  describe('App shell', () => {
    it('renders the storefront navigation for guests without internal jargon', async () => {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      await fixture.whenStable();
      const text = (fixture.nativeElement as HTMLElement).textContent || '';
      expect(text).toContain('Pedidos360');
      expect(text).toContain('Tienda');
      expect(text).toContain('Seguimiento');
      expect(text).not.toContain('Consola TI');
      expect(text).not.toContain('RabbitMQ');
      expect(text).not.toContain('USD');
    });

    it('shows the TI console link only to administrators', async () => {
      setSession(['Administrador']);
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      await fixture.whenStable();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Consola TI');
    });
  });

  describe('Cart: CLP and Chilean 19% IVA', () => {
    it('splits a gross CLP total into Neto = round(Total / 1.19) and IVA = Total - Neto', () => {
      const cart = TestBed.inject(CartService);
      seedCart(cart, [1499990, 29990]);
      expect(cart.totalAmount()).toBe(1529980);
      expect(cart.netAmount()).toBe(Math.round(1529980 / 1.19));
      expect(cart.ivaAmount()).toBe(1529980 - cart.netAmount());
      expect(cart.netAmount() + cart.ivaAmount()).toBe(cart.totalAmount());
    });

    it('never uses the buggy 0.81 / 0.19 split', () => {
      const cart = TestBed.inject(CartService);
      seedCart(cart, [119000]);
      expect(cart.netAmount()).toBe(100000);
      expect(cart.ivaAmount()).toBe(19000);
      expect(cart.netAmount()).not.toBe(Math.round(119000 * 0.81));
    });

    it('keeps CLP amounts as integers (no decimals)', () => {
      const cart = TestBed.inject(CartService);
      seedCart(cart, [9999.6]);
      expect(Number.isInteger(cart.totalAmount())).toBe(true);
      expect(Number.isInteger(cart.netAmount())).toBe(true);
      expect(Number.isInteger(cart.ivaAmount())).toBe(true);
    });

    it('clears local state after an order is placed', () => {
      const cart = TestBed.inject(CartService);
      seedCart(cart, [1500, 100]);
      cart.sincronizarPostOrden();
      expect(cart.totalItems()).toBe(0);
      expect(cart.items().length).toBe(0);
    });
  });

  describe('Checkout', () => {
    it('creates the order as PENDIENTE so payment confirmation happens asynchronously', () => {
      setSession(['Usuario']);
      const cart = TestBed.inject(CartService);
      seedCart(cart, [29990]);
      const app = TestBed.createComponent(App).componentInstance;

      app.realizarCheckout();

      expect(createdOrders.length).toBe(1);
      expect(createdOrders[0].estado).toBe('PENDIENTE');
      expect(createdOrders[0].items?.[0].productCode).toBe('PROD-001');
    });

    it('does not fabricate a tracking number when logistics has not created the shipment yet', () => {
      setSession(['Usuario']);
      const cart = TestBed.inject(CartService);
      seedCart(cart, [29990]);
      const app = TestBed.createComponent(App).componentInstance;

      app.realizarCheckout();

      expect(app.lastOrderResult()?.trackingNumber).toBeNull();
    });

    it('uses the real shipment guide when it exists', () => {
      setSession(['Usuario']);
      shipmentForOrder = { numeroGuia: 'TRACK-2026-00501' };
      const cart = TestBed.inject(CartService);
      seedCart(cart, [29990]);
      const app = TestBed.createComponent(App).componentInstance;

      app.realizarCheckout();

      expect(app.lastOrderResult()?.trackingNumber).toBe('TRACK-2026-00501');
    });
  });

  describe('Role guards', () => {
    it('authGuard redirects guests to /login', () => {
      setSession(null);
      const result = runGuard(authGuard);
      expect(result instanceof UrlTree).toBe(true);
      expect(String(result)).toBe('/login');
    });

    it('adminGuard allows Administrador and rejects other roles', () => {
      setSession(['Administrador']);
      expect(runGuard(adminGuard)).toBe(true);

      setSession(['Despachador']);
      expect(String(runGuard(adminGuard))).toBe('/tracking');

      setSession(['Usuario']);
      expect(String(runGuard(adminGuard))).toBe('/productos');
    });

    it('staffGuard allows Despachador and Administrador only', () => {
      setSession(['Despachador']);
      expect(runGuard(staffGuard)).toBe(true);
      setSession(['Administrador']);
      expect(runGuard(staffGuard)).toBe(true);
      setSession(['Usuario']);
      expect(String(runGuard(staffGuard))).toBe('/productos');
    });
  });

  describe('JWT role extraction', () => {
    it('extracts roles exclusively from token claims, never from email substrings', () => {
      const authService = TestBed.inject(AuthService);
      const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
      const payloadNoRoles = btoa(
        JSON.stringify({
          sub: 'user-123',
          email: 'admin-fake@ejemplo.cl',
          name: 'Fake Admin',
          iss: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_TestPool',
        })
      );
      const rolesNoClaims: string[] = (authService as any).extractRolesFromTokenAndClaims(
        { email: 'admin-fake@ejemplo.cl' },
        `${header}.${payloadNoRoles}.sig`
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
      const rolesDispatcher: string[] = (authService as any).extractRolesFromTokenAndClaims(
        {},
        `${header}.${payloadDispatcher}.sig`
      );
      expect(rolesDispatcher).toContain('Despachador');
    });

    it('exposes no client-side role simulator', () => {
      const authService = TestBed.inject(AuthService) as any;
      expect(authService.loginAsDevUser).toBeUndefined();
    });

    it('derives primaryRole from the session roles', () => {
      const authService = TestBed.inject(AuthService);
      setSession(['Despachador']);
      expect(authService.isDespachador()).toBe(true);
      expect(authService.isAdmin()).toBe(false);
      expect(authService.primaryRole()).toBe('Despachador');
    });

    it('maps canonical lab tenant administrator and dispatcher identities', () => {
      const authService = TestBed.inject(AuthService);
      const rolesAdmin: string[] = (authService as any).extractRolesFromTokenAndClaims(
        { preferred_username: 'hector.aguila@josecamposar.onmicrosoft.com' }
      );
      expect(rolesAdmin).toContain('Administrador');
      expect(rolesAdmin).toContain('ADMIN');

      const rolesDisp: string[] = (authService as any).extractRolesFromTokenAndClaims(
        { upn: 'despacho_aguila@josecamposar.onmicrosoft.com' }
      );
      expect(rolesDisp).toContain('Despachador');
    });

    it('maps Microsoft Entra ID directory roles and wids', () => {
      const authService = TestBed.inject(AuthService);
      const rolesWid: string[] = (authService as any).extractRolesFromTokenAndClaims(
        { wids: ['62e90394-69f5-4237-9190-012177145e10'] }
      );
      expect(rolesWid).toContain('Administrador');
      expect(rolesWid).toContain('ADMIN');
    });

    it('ignores Entra group object GUIDs so the staff fallback still applies', () => {
      const authService = TestBed.inject(AuthService);
      const roles: string[] = (authService as any).extractRolesFromTokenAndClaims({
        preferred_username: 'colaborador@duocuc.cl',
        groups: ['11111111-2222-3333-4444-555555555555'],
        wids: ['aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee']
      });
      expect(roles).toEqual(['Usuario']);
    });

    it('resolves the Administrador view right after Entra login, without a reload', () => {
      const authService = TestBed.inject(AuthService) as any;
      authService.handleAuthResponse({
        account: {
          username: 'colaborador@duocuc.cl',
          name: 'Colaborador',
          idTokenClaims: {
            roles: ['Rol Desconocido'],
            groups: ['11111111-2222-3333-4444-555555555555']
          }
        },
        accessToken: '',
        idToken: '',
        scopes: []
      });
      expect(authService.isAdmin()).toBe(true);
    });
  });
});
