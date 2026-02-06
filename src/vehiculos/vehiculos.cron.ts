import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VehiculosNotificacionesService } from './vehiculos-notificaciones.service';

@Injectable()
export class VehiculosCronService {
  private readonly logger = new Logger(VehiculosCronService.name);

  constructor(
    private readonly notificacionesService: VehiculosNotificacionesService,
  ) {}

  // Ejecutar todos los días a las 8:00 AM
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async verificarVencimientosDiario() {
    this.logger.log('Ejecutando verificación diaria de vencimientos...');
    try {
      const resultado = await this.notificacionesService.verificarVencimientosYNotificar();
      this.logger.log('Verificación diaria completada:', resultado);
    } catch (error) {
      this.logger.error('Error en verificación diaria:', error);
    }
  }

  // Ejecutar todos los lunes a las 9:00 AM
  @Cron('0 9 * * 1')
  async verificarVencimientosSemanal() {
    this.logger.log('Ejecutando verificación semanal de vencimientos...');
    try {
      const resultado = await this.notificacionesService.getVehiculosPorVencer();
      this.logger.log(`Verificación semanal: ${resultado.total.soatPorVencer} SOAT por vencer, ${resultado.total.tecnoPorVencer} Tecno por vencer`);
    } catch (error) {
      this.logger.error('Error en verificación semanal:', error);
    }
  }
}