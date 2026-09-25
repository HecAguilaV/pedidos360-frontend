import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { LogoutComponent } from './pages/logout/logout.component';
import { ProductosComponent } from './pages/productos/productos.component';
import { PedidosComponent } from './pages/pedidos/pedidos.component';
import { TrackingComponent } from './pages/tracking/tracking.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'productos', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'logout', component: LogoutComponent },
  { path: 'home', component: HomeComponent, canActivate: [authGuard] },
  { path: 'productos', component: ProductosComponent, canActivate: [authGuard] },
  { path: 'pedidos', component: PedidosComponent, canActivate: [authGuard] },
  { path: 'tracking', component: TrackingComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'productos' }
];
