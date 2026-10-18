import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';

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

describe('LoginComponent role redirect', () => {
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
      imports: [LoginComponent],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
  });

  function mountWithRoles(isAdmin: boolean, isDespachador: boolean) {
    const auth = TestBed.inject(AuthService);
    Object.defineProperty(auth, 'isAdmin', { value: () => isAdmin, configurable: true });
    Object.defineProperty(auth, 'isDespachador', { value: () => isDespachador, configurable: true });
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    return { fixture, navigate };
  }

  it('sends administrators to the operations dashboard (/home), not the storefront', () => {
    const { fixture, navigate } = mountWithRoles(true, false);
    fixture.componentInstance.redirectByRole();
    expect(navigate).toHaveBeenCalledWith(['/home']);
  });

  it('sends dispatchers to the logistics console (/tracking)', () => {
    const { fixture, navigate } = mountWithRoles(false, true);
    fixture.componentInstance.redirectByRole();
    expect(navigate).toHaveBeenCalledWith(['/tracking']);
  });

  it('sends plain clients to the storefront (/productos)', () => {
    const { fixture, navigate } = mountWithRoles(false, false);
    fixture.componentInstance.redirectByRole();
    expect(navigate).toHaveBeenCalledWith(['/productos']);
  });
});
