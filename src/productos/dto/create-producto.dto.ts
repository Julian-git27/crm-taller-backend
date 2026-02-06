import { IsString, IsNumber, IsOptional, Min, MaxLength } from 'class-validator';

export class CreateProductoDto {
  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  referencia?: string;  // Nueva propiedad

  @IsString()
  @MaxLength(50)
  @IsOptional()
  categoria?: string;

  @IsNumber()
  @Min(0)
  precio: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  stock?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  stock_minimo?: number;
}