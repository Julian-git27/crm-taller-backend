import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Patch,
  ParseIntPipe,
  Delete,
  Put,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { OrdenesServicioService } from './ordenes-servicio.service';
import { CreateOrdenDto } from './dto/create-orden.dto';
import { AddDetalleDto } from './dto/add-detalle.dto';
import { UpdateEstadoDto } from './dto/update-estado.dto';
import { UpdateObservacionesDto } from './dto/update-observaciones.dto';

@Controller('ordenes-servicio')
export class OrdenesServicioController {
  constructor(private readonly service: OrdenesServicioService) {}

  /* =========================
     CREAR ORDEN
  ========================= */
  @Post()
  create(@Body() dto: CreateOrdenDto) {
    return this.service.create(dto);
  }

  /* =========================
     LISTAR ÓRDENES
  ========================= */
  @Get()
  findAll() {
    return this.service.findAll();
  }

  /* =========================
     OBTENER ORDEN
  ========================= */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  /* =========================
     🔥 ACTUALIZAR TODOS LOS DETALLES
     ⚠️ SIEMPRE ANTES DE :id
  ========================= */
  @Put(':id/detalles-todos')
async updateDetalles(
  @Param('id', ParseIntPipe) id: number,
  @Body() dtos: AddDetalleDto[],
) {
  console.log('📝 Controller: Actualizando detalles para orden', id);
  const result = await this.service.updateDetalles(id, dtos);
  
  return result;
}
@Get(':id/emergency-check')
async emergencyCheck(@Param('id', ParseIntPipe) id: number) {
  console.log('🚨 EMERGENCY CHECK para orden', id);
  
  // Verificar directamente en la base de datos
  const connection = this.service['ordenRepo'].manager.connection;
  
  // 1. Contar detalles en la tabla
  const [detallesCount] = await connection.query(
    'SELECT COUNT(*) as count FROM orden_detalle WHERE ordenId = ?',
    [id]
  );
  
  // 2. Obtener detalles
  const detalles = await connection.query(
    'SELECT * FROM orden_detalle WHERE ordenId = ?',
    [id]
  );
  
  // 3. Obtener total de la orden
  const [orden] = await connection.query(
    'SELECT total FROM ordenes_servicio WHERE id = ?',
    [id]
  );
  
  return {
    db_check: {
      detalles_count: detallesCount.count,
      total_in_db: orden?.total || 0,
      detalles_in_db: detalles
    },
    service_check: await this.service.findOne(id)
  };
}
@Post(':id/force-refresh')
async forceRefresh(@Param('id', ParseIntPipe) id: number) {
  console.log('💥 FORCE REFRESH para orden', id);
  
  const connection = this.service['ordenRepo'].manager.connection;
  
  // 1. Limpiar todas las cachés
  await connection.query('RESET QUERY CACHE');
  
  // 2. Obtener datos con query FORCE INDEX
  const [detalles] = await connection.query(
    'SELECT SQL_NO_CACHE * FROM orden_detalle WHERE ordenId = ?',
    [id]
  );
  
  // 3. Recalcular total
  const total = detalles.reduce((sum, d) => 
    sum + (Number(d.cantidad) * Number(d.precio_unitario)), 0
  );
  
  // 4. Actualizar si es diferente
  const [currentTotal] = await connection.query(
    'SELECT total FROM ordenes_servicio WHERE id = ?',
    [id]
  );
  
  if (Number(currentTotal.total) !== total) {
    console.log('⚠️ Total diferente! Actualizando...');
    await connection.query(
      'UPDATE ordenes_servicio SET total = ? WHERE id = ?',
      [total, id]
    );
  }
  
  return {
    message: 'Force refresh completado',
    detalles_count: detalles.length,
    total_calculado: total,
    total_anterior: currentTotal.total
  };
}


  /* =========================
     ACTUALIZAR DATOS BÁSICOS
  ========================= */
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateOrdenDto,
  ) {
    return this.service.update(id, dto);
  }

  /* =========================
     ACTUALIZAR ESTADO
  ========================= */
  @Patch(':id/estado')
  updateEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEstadoDto,
  ) {
    return this.service.updateEstado(id, dto.estado);
  }
@Put(':id/detalles-mecanico')
updateDetallesMecanico(
  @Param('id', ParseIntPipe) id: number,
  @Req() req,
  @Body() dtos: AddDetalleDto[],
) {
  const { rol, mecanicoId } = req.user;

  if (rol !== 'MECANICO') {
    throw new ForbiddenException();
  }

  return this.service.updateDetallesMecanico(id, mecanicoId, dtos);
}


  /* =========================
     ELIMINAR ORDEN
  ========================= */
  @Delete(':id/secure')
async removeWithAdminPassword(
  @Param('id', ParseIntPipe) id: number,
  @Body('password') password: string,
) {
  return this.service.removeWithAdminPassword(id, password);
}

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Get('mis-ordenes')
findMisOrdenes(@Req() req) {
  const { rol, mecanicoId } = req.user;

  if (rol !== 'MECANICO') {
    throw new ForbiddenException('Acceso denegado');
  }

  return this.service.findByMecanico(mecanicoId);
}
@Patch(':id/observaciones')
updateObservaciones(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: UpdateObservacionesDto,
) {
  return this.service.updateObservaciones(id, dto.observaciones);
}

}

