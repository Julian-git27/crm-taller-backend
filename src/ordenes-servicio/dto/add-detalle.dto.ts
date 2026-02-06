// src/ordenes-servicio/dto/add-detalle.dto.ts
import { IsNotEmpty, IsNumber, IsOptional, Min, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum TipoDetalleDto {
  PRODUCTO = 'PRODUCTO',
  SERVICIO = 'SERVICIO',
  OTRO = 'OTRO',
}

export class AddDetalleDto {
  @ApiProperty({ 
    required: false, 
    description: 'ID del producto (opcional)',
    example: 1 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  productoId?: number;

  @ApiProperty({ 
    required: false, 
    description: 'ID del servicio (opcional)',
    example: 1 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  servicioId?: number;

  @ApiProperty({ 
    required: false, 
    description: 'Tipo de item (PRODUCTO, SERVICIO, OTRO)',
    enum: TipoDetalleDto,
    example: 'SERVICIO'
  })
  @IsOptional()
  @IsEnum(TipoDetalleDto)
  tipo?: TipoDetalleDto;

  @ApiProperty({ description: 'Descripción del item', example: 'Cambio de aceite' })
  @IsNotEmpty()
  @IsString()
  descripcion: string;

  @ApiProperty({ description: 'Cantidad', example: 1, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  cantidad: number;

  @ApiProperty({ description: 'Precio unitario', example: 45.50, minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio_unitario: number;
}