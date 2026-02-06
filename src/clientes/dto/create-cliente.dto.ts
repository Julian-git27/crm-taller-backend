import { IsString, IsEmail, IsOptional, MaxLength } from 'class-validator';

export class CreateClienteDto {
  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  telefono?: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  telefono2?: string;

  @IsEmail()
  @MaxLength(100)
  email: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  identificacion?: string;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  municipio?: string;
}