import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { VehiculosService } from './vehiculos.service';
import { CreateVehiculoDto } from './dto/create-vehiculo.dto';
import { UpdateVehiculoDto } from './dto/update-vehiculo.dto';

@Controller('vehiculos')
export class VehiculosController {
  constructor(private readonly vehiculosService: VehiculosService) {}

  @Post()
  create(@Body() dto: CreateVehiculoDto) {
    return this.vehiculosService.create(dto);
  }

  @Get()
  findAll() {
    return this.vehiculosService.findAll();
  }

  @Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
  return this.vehiculosService.findOne(id);
}
@Get('cliente/:clienteId')
@ApiOperation({ summary: 'Obtener vehículos por cliente' })
async findByCliente(@Param('clienteId', ParseIntPipe) clienteId: number) {
  return this.vehiculosService.findByCliente(clienteId);
}
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVehiculoDto,
  ) {
    return this.vehiculosService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vehiculosService.remove(+id);
  }
}
