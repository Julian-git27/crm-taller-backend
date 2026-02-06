// src/servicios/dto/create-servicio.dto.ts
import { IsString, IsNumber, IsBoolean, IsOptional, Min, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateServicioDto {
  @ApiProperty({ description: 'Nombre del servicio', example: 'Cambio de aceite' })
  @IsString()
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ required: false, description: 'Descripción detallada', example: 'Cambio de aceite de motor y filtro' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @ApiProperty({ description: 'Precio del servicio', example: 45.50 })
  @IsNumber()
  @Min(0)
  precio: number;

  @ApiProperty({ required: false, description: 'Duración estimada en minutos', example: 60, default: 60 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  duracionMinutos?: number = 60;

  @ApiProperty({ required: false, description: 'Categoría del servicio', example: 'Mantenimiento' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  categoria?: string;

  @ApiProperty({ required: false, description: 'Requiere repuestos para realizar el servicio?', default: false })
  @IsOptional()
  @IsBoolean()
  requiereRepuestos?: boolean = false;

  @ApiProperty({ required: false, description: 'Observaciones adicionales' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}