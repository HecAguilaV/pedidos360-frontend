import { Component, OnInit, signal, computed, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { EnviosService } from '../../services/envios.service';
import { AuthService } from '../../services/auth.service';
import { Envio } from '../../models/envio.model';

type EstadoFiltro = 'TODOS' | 'PEDIDO_CONFIRMADO' | 'PREPARANDO_PAQUETE' | 'EN_TRANSITO' | 'ENTREGADO';

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
  ordenEnPreparacion = signal<number | null>(null);
  errorOperacion = signal<string | null>(null);

  filtroEstado = signal<EstadoFiltro>('TODOS');
  filtroTexto = signal<string>('');

  readonly estados: { key: EstadoFiltro; label: string }[] = [
    { key: 'TODOS', label: 'Todos' },
    { key: 'PEDIDO_CONFIRMADO', label: 'Confirmados' },
    { key: 'PREPARANDO_PAQUETE', label: 'En Preparación' },
    { key: 'EN_TRANSITO', label: 'En Tránsito' },
    { key: 'ENTREGADO', label: 'Entregados' }
  ];

  contadores = computed(() => {
    const list = this.listaEnvios();
    return {
      total: list.length,
      preparando: list.filter(e => e.estado === 'PEDIDO_CONFIRMADO' || e.estado === 'PREPARANDO_PAQUETE').length,
      transito: list.filter(e => e.estado === 'EN_TRANSITO').length,
      entregados: list.filter(e => e.estado === 'ENTREGADO').length
    };
  });

  enviosFiltrados = computed(() => {
    const estado = this.filtroEstado();
    const texto = this.filtroTexto().trim().toLowerCase();
    return this.listaEnvios().filter(e => {
      if (estado !== 'TODOS' && e.estado !== estado) return false;
      if (!texto) return true;
      return e.numeroGuia.toLowerCase().includes(texto)
        || e.destinatario.toLowerCase().includes(texto)
        || String(e.orderId).includes(texto);
    });
  });

  constructor(
    private enviosService: EnviosService,
    private route: ActivatedRoute,
    public authService: AuthService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  get isStaff(): boolean {
    return this.authService.isDespachador() || this.authService.isAdmin();
  }

  ngOnInit(): void {
    if (this.isStaff) {
      const cached = this.enviosService.cachedEnvios?.();
      if (cached && cached.length > 0) {
        this.listaEnvios.set([...cached]);
        this.cdr.detectChanges();
      }
      this.cargarEnvios();
    }

    this.route.queryParamMap.subscribe(params => {
      const guia = params.get('guia');
      const orden = params.get('orden');
      if (guia && guia.trim()) {
        this.codigoBusqueda = guia.trim();
        this.buscarGuia();
      } else if (orden && !isNaN(Number(orden))) {
        this.buscarPorOrden(Number(orden));
      }
    });
  }

  cargarEnvios(): void {
    this.enviosService.listarEnvios().subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          this.listaEnvios.set(data);
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Error cargando despachos:', err);
        this.ngZone.run(() => {
          this.listaEnvios.set([]);
          this.cdr.detectChanges();
        });
      }
    });
  }

  buscarGuia(): void {
    const codigo = this.codigoBusqueda.trim();
    if (!codigo) return;

    this.cargando.set(true);
    this.noEncontrado.set(false);
    this.ordenEnPreparacion.set(null);

    this.enviosService.obtenerPorTracking(codigo).subscribe(envio => {
      this.ngZone.run(() => {
        this.cargando.set(false);
        this.envioEncontrado.set(envio);
        this.noEncontrado.set(!envio);
        this.cdr.detectChanges();
      });
    });
  }

  buscarPorOrden(orderId: number): void {
    this.cargando.set(true);
    this.noEncontrado.set(false);
    this.ordenEnPreparacion.set(null);

    this.enviosService.obtenerPorOrden(orderId).subscribe(envio => {
      this.ngZone.run(() => {
        this.cargando.set(false);
        if (envio) {
          this.envioEncontrado.set(envio);
          this.codigoBusqueda = envio.numeroGuia;
        } else {
          // The order exists but logistics has not generated a guide yet: say so honestly.
          this.envioEncontrado.set(null);
          this.ordenEnPreparacion.set(orderId);
        }
        this.cdr.detectChanges();
      });
    });
  }

  seleccionarEnvio(envio: Envio): void {
    this.envioEncontrado.set(envio);
    this.codigoBusqueda = envio.numeroGuia;
    this.noEncontrado.set(false);
    this.ordenEnPreparacion.set(null);
  }

  actualizarEstado(envio: Envio, nuevoEstado: string): void {
    if (!envio.id) return;
    this.cargando.set(true);
    this.errorOperacion.set(null);
    this.enviosService.actualizarEstado(envio.id, nuevoEstado).subscribe({
      next: (actualizado) => {
        this.ngZone.run(() => {
          this.cargando.set(false);
          if (this.envioEncontrado()?.id === actualizado.id) {
            this.envioEncontrado.set(actualizado);
          }
          this.listaEnvios.update(list => list.map(e => e.id === actualizado.id ? actualizado : e));
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.cargando.set(false);
          console.error('Error al actualizar estado del despacho:', err);
          this.errorOperacion.set('No se pudo actualizar el estado del despacho. Verifica tus permisos.');
          this.cdr.detectChanges();
        });
      }
    });
  }

  siguienteAccion(estado: string): { estado: string; label: string; icon: string } | null {
    switch (estado) {
      case 'PEDIDO_CONFIRMADO': return { estado: 'PREPARANDO_PAQUETE', label: 'Preparar', icon: 'ph-package' };
      case 'PREPARANDO_PAQUETE': return { estado: 'EN_TRANSITO', label: 'Despachar a Ruta', icon: 'ph-truck' };
      case 'EN_TRANSITO': return { estado: 'ENTREGADO', label: 'Confirmar Entrega', icon: 'ph-house-line' };
      default: return null;
    }
  }

  estadoLabel(estado: string): string {
    switch (estado) {
      case 'PEDIDO_CONFIRMADO': return 'Confirmado';
      case 'PREPARANDO_PAQUETE': return 'En Preparación';
      case 'EN_TRANSITO': return 'En Tránsito';
      case 'ENTREGADO': return 'Entregado';
      default: return estado;
    }
  }

  estadoBadge(estado: string): string {
    switch (estado) {
      case 'ENTREGADO': return 'success';
      case 'EN_TRANSITO': return 'info';
      case 'PREPARANDO_PAQUETE': return 'warning';
      default: return 'neutral';
    }
  }

  getStepIndex(estado: string): number {
    switch (estado) {
      case 'PEDIDO_CONFIRMADO': return 1;
      case 'PREPARANDO_PAQUETE': return 2;
      case 'EN_TRANSITO': return 3;
      case 'ENTREGADO': return 4;
      default: return 1;
    }
  }
}
