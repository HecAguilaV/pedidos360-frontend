import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-logout',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="logout-card">
      <div class="icon-circle">👋</div>
      <h2>Sesión Cerrada</h2>
      <p>Has cerrado sesión exitosamente de Pedidos360.</p>
      <a routerLink="/login" class="btn btn-primary">Volver a Iniciar Sesión</a>
    </div>
  `,
  styles: [`
    .logout-card {
      max-width: 400px;
      margin: 60px auto;
      text-align: center;
      padding: 40px 24px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
    }
    .icon-circle {
      font-size: 2.5rem;
      margin-bottom: 16px;
    }
    h2 {
      margin: 0 0 8px 0;
      color: #0f172a;
    }
    p {
      color: #64748b;
      margin-bottom: 24px;
    }
    .btn-primary {
      display: inline-block;
      padding: 10px 20px;
      background: #2563eb;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
    }
  `]
})
export class LogoutComponent implements OnInit {
  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.authService.logout();
  }
}
