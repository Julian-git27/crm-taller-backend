// src/facturas/facturas.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseIntPipe,
  Delete,
  Patch,
  HttpCode,
  HttpStatus,
  Query,
  Put,
  Res,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FacturasService } from './facturas.service';
import { CreateFacturaDto } from './dto/create-factura.dto';
import { UpdateEstadoPagoDto } from './dto/update-estado-pago.dto';
import { EstadoPago } from './facturas.entity';
import { EnviarFacturaEmailDto } from './dto/enviar-factura-email.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CreateFacturaIndependienteDto } from './dto/create-factura-independiente.dto';
import { UpdateFacturaDto } from './dto/update-factura.dto';
import { Response } from 'express'; // ✅ Añadir esto
@ApiTags('facturas')
@Controller('facturas')
export class FacturasController {
  constructor(private readonly service: FacturasService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva factura' })
  @ApiResponse({ status: 201, description: 'Factura creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  create(@Body() dto: CreateFacturaDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las facturas (no eliminadas)' })
  @ApiQuery({ name: 'estado', required: false, enum: EstadoPago, description: 'Filtrar por estado de pago' })
  @ApiQuery({ name: 'clienteId', required: false, type: Number, description: 'Filtrar por cliente' })
  @ApiQuery({ name: 'fechaInicio', required: false, type: String, description: 'Fecha inicio (YYYY-MM-DD)' })
  @ApiQuery({ name: 'fechaFin', required: false, type: String, description: 'Fecha fin (YYYY-MM-DD)' })
  findAll(
    @Query('estado') estado?: EstadoPago,
    @Query('clienteId') clienteId?: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    if (estado) {
      return this.service.findByEstado(estado);
    }
    
    if (clienteId) {
      return this.service.findByCliente(parseInt(clienteId));
    }
    
    if (fechaInicio && fechaFin) {
      return this.service.findByFechaRange(
        new Date(fechaInicio),
        new Date(fechaFin)
      );
    }
    
    return this.service.findAll();
  }

  @Get('estadisticas')
  @ApiOperation({ summary: 'Obtener estadísticas de facturas' })
  getEstadisticas() {
    return this.service.getEstadisticas();
  }
  
  @Get('reporte/mano-obra')
  @ApiOperation({ summary: 'Obtener reporte de mano de obra por mecánico' })
  @ApiQuery({ name: 'mecanicoId', required: true, type: Number, description: 'ID del mecánico' })
  @ApiQuery({ name: 'fechaInicio', required: true, type: String, description: 'Fecha inicio (YYYY-MM-DD)' })
  @ApiQuery({ name: 'fechaFin', required: true, type: String, description: 'Fecha fin (YYYY-MM-DD)' })
  @ApiQuery({ name: 'servicioNombre', required: true, type: String, description: 'Nombre del servicio (ej: mano de obra)' })
  async getReporteManoObra(
    @Query('mecanicoId', ParseIntPipe) mecanicoId: number,
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
    @Query('servicioNombre') servicioNombre: string
  ) {
    return this.service.getReporteManoObra(
      mecanicoId,
      fechaInicio,
      fechaFin,
      servicioNombre
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una factura por ID' })
  @ApiResponse({ status: 200, description: 'Factura encontrada' })
  @ApiResponse({ status: 404, description: 'Factura no encontrada' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id/estado-pago')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cambiar estado de pago de una factura' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  @ApiResponse({ status: 404, description: 'Factura no encontrada' })
  updateEstadoPago(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEstadoPagoDto,
  ) {
    return this.service.updateEstadoPago(id, dto);
  }

  @Put(':id/marcar-pagada')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar factura como pagada' })
  @ApiQuery({ name: 'fechaPago', required: false, type: String, description: 'Fecha de pago personalizada' })
  marcarComoPagada(
    @Param('id', ParseIntPipe) id: number,
    @Query('fechaPago') fechaPago?: string,
  ) {
    return this.service.marcarComoPagada(
      id,
      fechaPago ? new Date(fechaPago) : undefined
    );
  }

  @Put(':id/marcar-no-pagada')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar factura como no pagada' })
  marcarComoNoPagada(@Param('id', ParseIntPipe) id: number) {
    return this.service.marcarComoNoPagada(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una factura (soft delete)' })
  @ApiResponse({ status: 204, description: 'Factura eliminada' })
  @ApiResponse({ status: 403, description: 'No se puede eliminar una factura pagada' })
  @ApiResponse({ status: 404, description: 'Factura no encontrada' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Post('independiente')
  @ApiOperation({ summary: 'Crear una factura independiente (sin orden)' })
  @ApiResponse({ status: 201, description: 'Factura independiente creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Cliente o vehículo no encontrado' })
  createIndependiente(@Body() dto: CreateFacturaIndependienteDto) {
    return this.service.createIndependiente(dto);
  }

  @Put(':id/restaurar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restaurar una factura eliminada' })
  @ApiResponse({ status: 200, description: 'Factura restaurada' })
  @ApiResponse({ status: 404, description: 'Factura no encontrada' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.service.restore(id);
  }

  @Put(':id/editar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Editar una factura (solo si NO PAGA)' })
  @ApiResponse({ status: 200, description: 'Factura actualizada' })
  @ApiResponse({ status: 400, description: 'No se puede editar una factura pagada' })
  @ApiResponse({ status: 404, description: 'Factura no encontrada' })
  async editarFactura(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFacturaDto,
  ) {
    return this.service.editarFactura(id, dto);
  }

  @Delete(':id/secure')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar una factura con verificación de contraseña' })
  @ApiResponse({ status: 200, description: 'Factura eliminada exitosamente' })
  @ApiResponse({ status: 401, description: 'Contraseña incorrecta' })
  @ApiResponse({ status: 403, description: 'No se puede eliminar una factura pagada' })
  @ApiResponse({ status: 404, description: 'Factura no encontrada' })
  async deleteSecure(
    @Param('id', ParseIntPipe) id: number,
    @Body('password') password: string
  ) {
    return this.service.deleteSecure(id, password);
  }

  // NUEVO ENDPOINT: Validar contraseña para editar
  @Post(':id/validar-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validar contraseña para editar una factura' })
  @ApiResponse({ status: 200, description: 'Contraseña validada' })
  @ApiResponse({ status: 401, description: 'Contraseña incorrecta' })
  @ApiResponse({ status: 404, description: 'Factura no encontrada' })
  async validarPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { password: string, accion: string }
  ) {
    return this.service.validarPassword(id, body.password, body.accion);
  }

  @Get(':id/puede-editar')
  @ApiOperation({ summary: 'Verificar si una factura puede ser editada' })
  @ApiResponse({ status: 200, description: 'Estado de edición' })
  @ApiResponse({ status: 404, description: 'Factura no encontrada' })
  puedeEditar(@Param('id', ParseIntPipe) id: number) {
    return this.service.verificarSiPuedeEditar(id);
  }
  @Get(':id/pdf')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Descargar PDF de factura' })
  @ApiResponse({ status: 200, description: 'PDF generado' })
  @ApiResponse({ status: 404, description: 'Factura no encontrada' })
  async generarPDF(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response
  ) {
    try {
      const pdfBuffer = await this.service.generarPdfBuffer(id);
      
      // Configurar headers para descarga
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="factura-${id}.pdf"`,
        'Content-Length': pdfBuffer.length,
      });
      
      // Enviar el buffer como respuesta
      res.send(pdfBuffer);
      
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error al generar PDF');
    }
  }
  @Post(':id/enviar-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar factura por correo electrónico' })
  @ApiResponse({ status: 200, description: 'Factura enviada por correo' })
  @ApiResponse({ status: 404, description: 'Factura no encontrada' })
  @ApiResponse({ status: 400, description: 'Error al enviar correo' })
  async enviarFacturaPorEmail(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EnviarFacturaEmailDto,
  ) {
    return this.service.enviarFacturaPorEmail(id, dto);
  }
}