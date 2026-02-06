import { Controller, Get, Post, UseGuards, Logger, Param, Body, HttpException, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VehiculosNotificacionesService } from './vehiculos-notificaciones.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { EnviarRecordatorioDto } from './dto/enviar-recordatorio.dto';

@ApiTags('vehiculos-notificaciones')
@Controller('vehiculos-notificaciones')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class VehiculosNotificacionesController {
  private readonly logger = new Logger(VehiculosNotificacionesController.name);

  constructor(
    private readonly notificacionesService: VehiculosNotificacionesService,
  ) {}

  @Get('verificar-vencimientos')
  @ApiOperation({ summary: 'Verificar documentos próximos a vencer' })
  @ApiResponse({ status: 200, description: 'Lista de vehículos con documentos próximos a vencer' })
  async verificarVencimientos() {
    this.logger.log('Solicitud manual de verificación de vencimientos');
    return await this.notificacionesService.verificarVencimientosYNotificar();
  }

  @Get('por-vencer')
  @ApiOperation({ summary: 'Obtener vehículos con documentos por vencer' })
  @ApiResponse({ status: 200, description: 'Lista de vehículos por vencer' })
  async getVehiculosPorVencer() {
    return await this.notificacionesService.getVehiculosPorVencer();
  }

  @Post('enviar-recordatorio/:vehiculoId')
  @ApiOperation({ summary: 'Enviar recordatorio manual para un vehículo' })
  @ApiParam({
    name: 'vehiculoId',
    description: 'ID del vehículo',
    type: Number,
  })
  @ApiResponse({ status: 200, description: 'Recordatorio enviado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o faltantes' })
  @ApiResponse({ status: 404, description: 'Vehículo no encontrado' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  async enviarRecordatorioManual(
    @Param('vehiculoId') vehiculoId: string,
    @Body() body: EnviarRecordatorioDto
  ) {
    try {
      this.logger.log(`Enviando recordatorio manual para vehículo ${vehiculoId}, tipo: ${body.tipoDocumento}`);
      
      // Validar que vehiculoId sea un número válido
      const id = parseInt(vehiculoId);
      if (isNaN(id)) {
        throw new HttpException(
          'ID de vehículo inválido',
          HttpStatus.BAD_REQUEST
        );
      }

      const resultado = await this.notificacionesService.enviarRecordatorioManual(
        id,
        body.tipoDocumento
      );
      
      this.logger.log(`Recordatorio enviado exitosamente para vehículo ${vehiculoId}`);
      
      return {
        success: true,
        message: 'Recordatorio enviado exitosamente',
        data: resultado,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error en enviarRecordatorioManual para vehículo ${vehiculoId}:`, error);
      
      // Si ya es una excepción HTTP, relanzarla
      if (error instanceof HttpException) {
        throw error;
      }
      
      // Si es otro error, convertirlo a 500
      throw new HttpException(
        `Error interno del servidor: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Nuevo endpoint para obtener vehículos sin email
  @Get('sin-email')
  @ApiOperation({ summary: 'Obtener vehículos cuyo cliente no tiene email' })
  async getVehiculosSinEmail() {
    const vehiculos = await this.notificacionesService.getVehiculosSinEmail();
    return {
      total: vehiculos.length,
      vehiculos,
    };
  }
}