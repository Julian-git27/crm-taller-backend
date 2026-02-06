// src/mecanicos/mecanicos.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  ParseIntPipe,
  Query,
  Patch,
} from '@nestjs/common';
import { MecanicosService } from './mecanicos.service';
import { CreateMecanicoDto } from './dto/create-mecanico.dto';
import { UpdateMecanicoDto } from './dto/update-mecanico.dto';

@Controller('mecanicos')
export class MecanicosController {
  constructor(private readonly mecanicosService: MecanicosService) {}

  @Post()
  create(@Body() dto: CreateMecanicoDto) {
    return this.mecanicosService.create(dto);
  }

  @Get()
  findAll(@Query('search') search?: string) {
    return this.mecanicosService.findAll(search);
  }

  @Get('activos')
  findActive() {
    return this.mecanicosService.findActive();
  }

  @Get('estadisticas')
  getStats() {
    return this.mecanicosService.getStats();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.mecanicosService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMecanicoDto,
  ) {
    return this.mecanicosService.update(id, dto);
  }

  @Patch(':id/toggle-status')
  toggleStatus(@Param('id', ParseIntPipe) id: number) {
    return this.mecanicosService.toggleStatus(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.mecanicosService.remove(id);
  }
}