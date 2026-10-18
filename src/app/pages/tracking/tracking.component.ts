import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { EnviosService } from '../../services/envios.service';
import { Envio } from '../../models/envio.model';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tracking.component.html',
  styleUrl: './tracking.component.css'
})
export class TrackingComponent implements OnInit {
  codigoBusqueda = '';
  envioEncontrado = signal<Envio | null>(null);
  listaEnvios = signal<Envio[]>([]);
  cargando = signal<boolean>(false);
  noEncontrado = signal<boolean>(false);

  constructor(
    private enviosService: EnviosService,
    private route: ActivatedRoute,
    public authService: AuthService
  ) {}

  actualizarEstado(id: number, nuevoEstado: string): void {
    this.cargando.set(true);
    this.enviosService.actualizarEstado(id, nuevoEstado).subscribe({
      next: (actualizado) => {
        this.cargando.set(false);
        this.envioEncontrado.set(actualizado);
        this.cargarEnviosRecientes(false);
      },
      error: (err) => {
        this.cargando.set(false);
        console.error('Error al actualizar estado del despacho:', err);
      }
    });
  }

  ngOnInit(): void {
    const initialGuia = this.route.snapshot.queryParamMap.get('guia');
    if (initialGuia && initialGuia.trim()) {
      this.codigoBusqueda = initialGuia.trim();
      this.cargarEnviosRecientes(false);
      this.buscarGuia();
    } else {
      this.cargarEnviosRecientes(true);
    }

    this.route.queryParamMap.subscribe(params => {
      const guia = params.get('guia');
      if (guia && guia.trim() && guia.trim() !== this.codigoBusqueda) {
        this.codigoBusqueda = guia.trim();
        this.buscarGuia();
      }
    });
  }

  cargarEnviosRecientes(selectFirstIfEmpty: boolean = true): void {
    this.enviosService.listarEnvios().subscribe({
      next: (data) => {
        this.listaEnvios.set(data);
        if (selectFirstIfEmpty && data.length > 0 && !this.envioEncontrado()) {
          this.envioEncontrado.set(data[0]);
        }
      },
      error: (err) => {
        console.error('Error cargando envíos recientes:', err);
        this.listaEnvios.set([]);
      }
    });
  }

  buscarGuia(): void {
    if (!this.codigoBusqueda.trim()) return;

    this.cargando.set(true);
    this.noEncontrado.set(false);

    this.enviosService.obtenerPorTracking(this.codigoBusqueda.trim()).subscribe(envio => {
      this.cargando.set(false);
      if (envio) {
        this.envioEncontrado.set(envio);
        this.noEncontrado.set(false);
      } else {
        const local = this.listaEnvios().find(e => e.numeroGuia.toLowerCase().includes(this.codigoBusqueda.toLowerCase().trim()));
        if (local) {
          this.envioEncontrado.set(local);
          this.noEncontrado.set(false);
        } else {
          this.envioEncontrado.set(null);
          this.noEncontrado.set(true);
        }
      }
    });
  }

  seleccionarGuia(envio: Envio): void {
    this.envioEncontrado.set(envio);
    this.codigoBusqueda = envio.numeroGuia;
    this.noEncontrado.set(false);
  }

  getStepIndex(estado: string): number {
    switch (estado) {
      case 'PEDIDO_CONFIRMADO': return 1;
      case 'PREPARANDO_PAQUETE': return 2;
      case 'EN_TRANSITO': return 3;
      case 'ENTREGADO': return 4;
      default: return 2;
    }
  }
}
