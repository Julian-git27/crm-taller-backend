// src/facturas/dto/update-factura.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateFacturaDetalleDto {
  @ApiProperty({ required: false })
  @IsOptional()
  id?: number;

  @ApiProperty({ description: 'Descripción del item', example: 'Cambio de aceite' })
  @IsString()
  descripcion: string;

  @ApiProperty({ description: 'Cantidad', example: 1, minimum: 1 })
  @IsNumber()
  @Min(1)
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
  productoId?: number;

  @ApiProperty({ 
    required: false, 
    description: 'ID del servicio (opcional)',
    example: 1 
  })
  @IsOptional()
  servicioId?: number;

  @ApiProperty({ 
    required: false, 
    description: 'Tipo de item (PRODUCTO, SERVICIO, OTRO)',
    example: 'SERVICIO',
    enum: ['PRODUCTO', 'SERVICIO', 'OTRO']
  })
  @IsOptional()
  @IsString()
  tipo?: string;
}

export class UpdateFacturaDto {
  @ApiProperty({ 
    required: false, 
    description: 'Método de pago',
    example: 'EFECTIVO'
  })
  @IsOptional()
  @IsString()
  metodo_pago?: string;

  @ApiProperty({ 
    required: false, 
    description: 'Notas adicionales',
    example: 'Factura actualizada' 
  })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiProperty({ 
    required: false, 
    description: 'ID del mecánico asignado (solo para facturas independientes)',
    example: 1 
  })
  @IsOptional()
  @IsNumber()
  mecanicoId?: number;

  @ApiProperty({ 
    required: false,
    description: 'Nuevos detalles de la factura',
    type: [UpdateFacturaDetalleDto]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateFacturaDetalleDto)
  detalles?: UpdateFacturaDetalleDto[];
}