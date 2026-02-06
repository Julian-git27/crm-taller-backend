import { IsString, IsNumber, IsOptional, Min, Max, IsInt, IsDateString } from 'class-validator';

export class UpdateVehiculoDto {
  @IsString()
  @IsOptional()
  placa?: string;

  @IsString()
  @IsOptional()
  marca?: string;

  @IsString()
  @IsOptional()
  modelo?: string;

  @IsNumber()
  @IsOptional()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  anio?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  cilindraje?: number;

  @IsString()
  @IsOptional()
  color?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  kilometraje?: number;

  @IsDateString()
  @IsOptional()
  fecha_vencimiento_soat?: string;

  @IsDateString()
  @IsOptional()
  fecha_vencimiento_tecnomecanica?: string;

  @IsNumber()
  @IsOptional()
  clienteId?: number;
}