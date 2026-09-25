import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EnviosService } from '../../services/envios.service';
import { Envio } from '../../models/envio.model';

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

  constructor(private enviosService: EnviosService) {}

  ngOnInit(): void {
    this.cargarEnviosRecientes();
  }

  cargarEnviosRecientes(): void {
    this.enviosService.listarEnvios().subscribe(data => {
      this.listaEnvios.set(data);
      if (data.length > 0 && !this.envioEncontrado()) {
        this.envioEncontrado.set(data[0]);
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
        // Buscar en la lista local o fallback
        const local = this.listaEnvios().find(e => e.numeroGuia.toLowerCase().includes(this.codigoBusqueda.toLowerCase().trim()));
        if (local) {
          this.envioEncontrado.set(local);
          this.noEncontrado.set(false);
        } else {
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
