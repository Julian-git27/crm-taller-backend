// src/ordenes-servicio/dto/create-orden.dto.ts
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// Crear un DTO para detalles de orden
export class OrdenDetalleDto {
  @ApiProperty({ description: 'Descripción del item', example: 'Cambio de aceite' })
  @IsString()
  descripcion: string;

  @ApiProperty({ description: 'Cantidad', example: 1 })
  @IsNumber()
  cantidad: number;

  @ApiProperty({ description: 'Precio unitario', example: 45.50 })
  @IsNumber()
  precio_unitario: number;

  @ApiProperty({ 
    required: false, 
    description: 'ID del producto (opcional)',
    example: 1 
  })
  @IsOptional()
  @IsNumber()
  productoId?: number;

  @ApiProperty({ 
    required: false, 
    description: 'ID del servicio (opcional)',
    example: 1 
  })
  @IsOptional()
  @IsNumber()
  servicioId?: number;

  @ApiProperty({ 
    required: false, 
    description: 'Tipo de item (PRODUCTO, SERVICIO, OTRO)',
    example: 'SERVICIO'
  })
  @IsOptional()
  @IsString()
  tipo?: string;
}

export class CreateOrdenDto {
  @ApiProperty({ description: 'ID del cliente', example: 1 })
  @IsNotEmpty()
  @IsNumber()
  clienteId: number;

  @ApiProperty({ description: 'ID del vehículo', example: 1 })
  @IsNotEmpty()
  @IsNumber()
  vehiculoId: number;

  @ApiProperty({ description: 'ID del mecánico', example: 1 })
  @IsNotEmpty()
  @IsNumber()
  mecanicoId: number;

  @ApiProperty({ 
    required: false, 
    description: 'Observaciones de la orden',
    example: 'El cliente reporta ruido en el motor' 
  })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiProperty({ 
    required: false,
    description: 'Detalles iniciales de la orden',
    type: [OrdenDetalleDto]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrdenDetalleDto)
  detalles?: OrdenDetalleDto[];
}