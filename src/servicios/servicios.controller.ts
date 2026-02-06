// src/servicios/servicios.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
  ParseIntPipe,
  DefaultValuePipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ServiciosService } from './servicios.service';
import { CreateServicioDto } from './dto/create-servicio.dto';
import { UpdateServicioDto } from './dto/update-servicio.dto';
import { Servicio } from './servicios.entity';

@ApiTags('servicios')
@Controller('servicios')
@UseInterceptors(ClassSerializerInterceptor)
export class ServiciosController {
  constructor(private readonly serviciosService: ServiciosService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo servicio' })
  @ApiResponse({ status: 201, description: 'Servicio creado exitosamente' })
  @ApiResponse({ status: 409, description: 'El servicio ya existe' })
  async create(@Body() createServicioDto: CreateServicioDto): Promise<Servicio> {
    return await this.serviciosService.create(createServicioDto);
  }

 @Get()
async findAll(
  @Query('inactivos', new DefaultValuePipe(false), ParseBoolPipe)
  includeInactive: boolean,

  @Query('categoria') categoria?: string,

  @Query('requiereRepuestos', new DefaultValuePipe(false), ParseBoolPipe)
  requiereRepuestos?: boolean,
): Promise<Servicio[]> {

  if (categoria) {
    return await this.serviciosService.findByCategoria(categoria);
  }

  if (requiereRepuestos === true) {
    return await this.serviciosService.findRequireRepuestos();
  }

  return await this.serviciosService.findAll(includeInactive);
}


  @Get('paginated')
  @ApiOperation({ summary: 'Obtener servicios paginados' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Elementos por página', example: 10 })
  @ApiQuery({ name: 'inactivos', required: false, type: Boolean, description: 'Incluir servicios inactivos' })
  async findPaginated(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('inactivos') includeInactive?: boolean,
  ) {
    return await this.serviciosService.findPaginated(page, limit, includeInactive === true);
  }

  @Get('buscar')
  @ApiOperation({ summary: 'Buscar servicios por término' })
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Término de búsqueda' })
  async search(@Query('q') term: string): Promise<Servicio[]> {
    if (!term || term.trim() === '') {
      return await this.serviciosService.findAll();
    }
    return await this.serviciosService.search(term);
  }

  @Get('disponibles')
  @ApiOperation({ summary: 'Obtener servicios disponibles (activos)' })
  async findAvailable(): Promise<Servicio[]> {
    return await this.serviciosService.findAll(false);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un servicio por ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del servicio' })
  @ApiResponse({ status: 200, description: 'Servicio encontrado' })
  @ApiResponse({ status: 404, description: 'Servicio no encontrado' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Servicio> {
    return await this.serviciosService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un servicio' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del servicio' })
  @ApiResponse({ status: 200, description: 'Servicio actualizado' })
  @ApiResponse({ status: 404, description: 'Servicio no encontrado' })
  @ApiResponse({ status: 409, description: 'Conflicto de nombre' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateServicioDto: UpdateServicioDto,
  ): Promise<Servicio> {
    return await this.serviciosService.update(id, updateServicioDto);
  }

  @Patch(':id/toggle-activo')
  @ApiOperation({ summary: 'Activar/desactivar un servicio' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del servicio' })
  async toggleActivo(@Param('id', ParseIntPipe) id: number): Promise<Servicio> {
    return await this.serviciosService.toggleActivo(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un servicio (soft delete)' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del servicio' })
  @ApiResponse({ status: 204, description: 'Servicio eliminado' })
  @ApiResponse({ status: 404, description: 'Servicio no encontrado' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return await this.serviciosService.remove(id);
  }

  @Post(':id/restaurar')
  @ApiOperation({ summary: 'Restaurar un servicio eliminado' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del servicio' })
  async restore(@Param('id', ParseIntPipe) id: number): Promise<Servicio> {
    return await this.serviciosService.restore(id);
  }

  @Get('categorias/lista')
  @ApiOperation({ summary: 'Obtener lista de categorías únicas' })
  async getCategorias(): Promise<string[]> {
    const servicios = await this.serviciosService.findAll(true);
    const categorias = [...new Set(servicios.map(s => s.categoria).filter(Boolean))];
    return categorias.sort();
  }
}