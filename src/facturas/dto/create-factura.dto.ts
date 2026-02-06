// src/facturas/dto/create-factura.dto.ts
import { IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoPago } from '../facturas.entity';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFacturaDto {
  @ApiProperty({ description: 'ID de la orden a facturar', example: 1 })
  @Type(() => Number) // ✅ Agregar transformación de tipo
  @IsNumber()
  ordenId: number;
  
  @ApiProperty({ 
    description: 'Método de pago', 
    example: 'EFECTIVO',
    enum: ['EFECTIVO', 'TARJETA_CREDITO', 'TARJETA_DEBITO', 'TRANSFERENCIA', 'CHEQUE', 'OTRO']
  })
  @IsString()
  metodo_pago: string;
  
  @ApiProperty({ 
    required: false, 
    description: 'Notas adicionales para la factura',
    example: 'Pago realizado en efectivo' 
  })
  @IsOptional()
  @IsString()
  notas?: string;
  
  @ApiProperty({ 
    required: false, 
    description: 'Estado de pago inicial',
    enum: EstadoPago,
    default: EstadoPago.NO_PAGA 
  })
  @IsOptional()
  @IsEnum(EstadoPago)
  estado_pago?: EstadoPago = EstadoPago.NO_PAGA;

  @ApiProperty({ 
    required: false, 
    description: 'ID del mecánico asignado (opcional - por defecto se usa el de la orden)',
    example: 1 
  })
  @IsOptional()
  @Type(() => Number) // ✅ Agregar transformación de tipo
  @IsNumber()
  mecanicoId?: number;
}