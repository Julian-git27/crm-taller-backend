import { IsString, IsEmail, IsOptional, MaxLength } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateClienteDto } from './create-cliente.dto';

export class UpdateClienteDto extends PartialType(CreateClienteDto) {}
// O si no usas PartialType:
/*
export class UpdateClienteDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  nombre?: string;

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
  @IsOptional()
  email?: string;

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
*/