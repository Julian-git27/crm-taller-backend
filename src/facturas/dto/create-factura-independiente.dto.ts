// src/facturas/dto/create-factura-independiente.dto.ts
import { IsArray, IsEnum, IsOptional, IsString, IsNumber, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoPago } from '../facturas.entity';
import { ApiProperty } from '@nestjs/swagger';

export class FacturaDetalleDto {
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
    example: 'SERVICIO',
    enum: ['PRODUCTO', 'SERVICIO', 'OTRO']
  })
  @IsOptional()
  @IsString()
  tipo?: string;
}

export class CreateFacturaIndependienteDto {
  @ApiProperty({ 
    required: false, 
    description: 'ID del cliente existente (opcional - si no se envía, se crea nuevo)',
    example: 1 
  })
  @IsOptional()
  @IsNumber()
  clienteId?: number;

  @ApiProperty({ 
    required: false, 
    description: 'Datos del nuevo cliente (si no se envía clienteId)',
    example: { nombre: 'Juan Pérez', telefono: '3001234567', email: 'juan@email.com' }
  })
  @IsOptional()
  nuevoCliente?: any;

  @ApiProperty({ 
    required: false, 
    description: 'ID del vehículo existente (opcional)',
    example: 1 
  })
  @IsOptional()
  @IsNumber()
  vehiculoId?: number;

  @ApiProperty({ 
    required: false, 
    description: 'Datos del nuevo vehículo',
    example: { placa: 'ABC123', marca: 'Toyota', modelo: 'Corolla' }
  })
  @IsOptional()
  nuevoVehiculo?: any;

  @ApiProperty({ 
    required: false, 
    description: 'ID del mecánico asignado (opcional)',
    example: 1 
  })
  @IsOptional()
  @IsNumber()
  mecanicoId?: number;

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
    example: 'Factura por servicios varios' 
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
    description: 'Detalles de la factura',
    type: [FacturaDetalleDto],
    example: [
      { 
        descripcion: 'Cambio de aceite', 
        cantidad: 1, 
        precio_unitario: 45.50,
        tipo: 'SERVICIO',
        servicioId: 1
      },
      { 
        descripcion: 'Filtro de aire', 
        cantidad: 1, 
        precio_unitario: 25.00,
        tipo: 'PRODUCTO',
        productoId: 2
      }
    ]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FacturaDetalleDto)
  detalles: FacturaDetalleDto[];
}