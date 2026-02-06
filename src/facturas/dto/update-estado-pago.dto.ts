// src/facturas/dto/update-estado-pago.dto.ts
import { IsEnum, IsOptional } from 'class-validator';
import { EstadoPago } from '../facturas.entity';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateEstadoPagoDto {
  @ApiProperty({
    enum: EstadoPago,
    description: 'Estado de pago de la factura',
    example: 'PAGA'
  })
  @IsEnum(EstadoPago)
  estado_pago: EstadoPago;

  @ApiProperty({
    required: false,
    description: 'Fecha personalizada de pago (si no se envía, se usa la fecha actual)',
    example: '2024-01-15T10:30:00Z'
  })
  @IsOptional()
  fecha_pago?: Date;
}